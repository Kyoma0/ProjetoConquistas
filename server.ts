
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import fs from 'fs';
import sharp from 'sharp';
import dns from 'dns';
import { promisify } from 'util';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { sendConfirmationEmail, sendPasswordResetEmail } from './services/emailService';
import { ADMIN_EMAIL } from './constants';
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
try {
  const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    admin.initializeApp({
      projectId: config.projectId,
    });
    console.log('Firebase Admin SDK inicializado com sucesso.');
  } else {
    admin.initializeApp();
    console.log('Firebase Admin SDK inicializado com os padrões.');
  }
} catch (error) {
  console.error('Erro ao inicializar o Firebase Admin SDK:', error);
}

const lookupPromise = promisify(dns.lookup);

function isIpPrivateOrReserved(ip: string): boolean {
  // IPv4 checks
  if (/^(127\.|10\.|169\.254\.)/.test(ip)) return true;
  
  if (ip.startsWith('172.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length >= 2 && parts[1] >= 16 && parts[1] <= 31) {
      return true;
    }
  }
  
  if (ip.startsWith('192.168.')) return true;
  
  // IPv6 checks
  if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }
  
  return false;
}

async function validateUrlForSsrf(urlStr: string): Promise<boolean> {
  try {
    const parsed = new URL(urlStr);
    
    // Aceitar apenas http e https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    
    const hostname = parsed.hostname;
    
    // Verificar se o hostname é um IP
    const isIp = /^[0-9a-f.:]+$/i.test(hostname);
    if (isIp) {
      return !isIpPrivateOrReserved(hostname);
    }
    
    // Resolver hostname para obter o IP de destino real
    try {
      const lookupResult = await lookupPromise(hostname);
      const ip = lookupResult.address;
      if (isIpPrivateOrReserved(ip)) {
        return false;
      }
    } catch {
      // Se falhar a resolução de DNS, rejeitamos por segurança
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Ensure default map image exists as robust fallback
  try {
    const files = fs.readdirSync(uploadsDir).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    });
    if (files.length === 0) {
      console.log('No images found in uploads. Generating a default fallback map image...');
      const fallbackFile = path.join(uploadsDir, 'default_map_fallback.png');
      const width = 2048;
      const height = 2048;
      
      const svgImage = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#0b0e14" />
          <g stroke="#1a202c" stroke-width="2">
            ${Array.from({ length: 21 }, (_, i) => {
              const pos = (i * width) / 20;
              return `
                <line x1="${pos}" y1="0" x2="${pos}" y2="${height}" />
                <line x1="0" y1="${pos}" x2="${width}" y2="${pos}" />
              `;
            }).join('')}
          </g>
          <text x="50%" y="45%" fill="#38bdf8" font-family="sans-serif" font-size="64" font-weight="bold" text-anchor="middle">ACHIEVEMENT HUB MAP</text>
          <text x="50%" y="52%" fill="#94a3b8" font-family="sans-serif" font-size="32" text-anchor="middle">Default Map Fallback (No uploaded image found)</text>
          <text x="50%" y="58%" fill="#64748b" font-family="sans-serif" font-size="28" text-anchor="middle">Please upload your custom map image in the Admin Panel</text>
        </svg>
      `;

      await sharp(Buffer.from(svgImage))
        .png()
        .toFile(fallbackFile);
      console.log('Default fallback map image generated successfully at:', fallbackFile);
    }
  } catch (err) {
    console.error('Error checking or generating fallback map image:', err);
  }

  // Ensure tiles directory exists
  const tilesDir = path.join(__dirname, 'public', 'tiles');
  if (!fs.existsSync(tilesDir)) {
    fs.mkdirSync(tilesDir, { recursive: true });
  }

  // WebSocket Server for Chunked Uploads and Real-time Chat
  const wss = new WebSocketServer({ server });
  const uploadSessions = new Map<string, { 
    filename: string, 
    chunks: Buffer[], 
    totalChunks: number, 
    receivedChunks: number 
  }>();

  // Map to store active chat connections: userId -> WebSocket
  const chatClients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    let currentUserId: string | null = null;

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'IDENTIFY') {
          const { userId, token } = data;
          if (!token) {
            console.error('WS Connection rejected: No auth token provided.');
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Token de autenticação obrigatório.' }));
            ws.close();
            return;
          }
          try {
            const decodedToken = await getAuth().verifyIdToken(token);
            if (decodedToken.uid !== userId) {
              console.error(`WS Connection rejected: Token UID (${decodedToken.uid}) does not match claimed userId (${userId})`);
              ws.send(JSON.stringify({ type: 'ERROR', message: 'ID do usuário não correspondente.' }));
              ws.close();
              return;
            }
            currentUserId = userId;
            chatClients.set(currentUserId, ws);
            // Broadcast user online
            const onlinePayload = JSON.stringify({ type: 'USER_ONLINE', userId: currentUserId });
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(onlinePayload);
              }
            });
            // Send current online users to the new client
            const onlineUsers = Array.from(chatClients.keys());
            ws.send(JSON.stringify({ type: 'ONLINE_USERS_LIST', users: onlineUsers }));
          } catch (err) {
            console.error('WS Connection rejected: Token inválido.', err);
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Token de autenticação inválido.' }));
            ws.close();
            return;
          }
        }

        else if (data.type === 'UPLOAD_START') {
          const sessionId = `up_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          uploadSessions.set(sessionId, {
            filename: data.filename,
            chunks: [],
            totalChunks: data.totalChunks,
            receivedChunks: 0
          });
          ws.send(JSON.stringify({ type: 'UPLOAD_SESSION_READY', sessionId }));
        } 
        
        else if (data.type === 'UPLOAD_CHUNK') {
          const session = uploadSessions.get(data.sessionId);
          if (session) {
            // Convert base64 chunk back to buffer
            const chunkBuffer = Buffer.from(data.chunk, 'base64');
            session.chunks[data.chunkIndex] = chunkBuffer;
            session.receivedChunks++;
            
            // Progress update
            ws.send(JSON.stringify({ 
              type: 'UPLOAD_PROGRESS', 
              progress: Math.round((session.receivedChunks / session.totalChunks) * 100) 
            }));

            if (session.receivedChunks === session.totalChunks) {
              // Reassemble
              const finalBuffer = Buffer.concat(session.chunks);
              const fileExt = path.extname(session.filename);
              const safeFilename = `${data.sessionId}${fileExt}`;
              const filePath = path.join(uploadsDir, safeFilename);
              
              fs.writeFileSync(filePath, finalBuffer);
              
              const publicUrl = `/uploads/${safeFilename}`;
              ws.send(JSON.stringify({ type: 'UPLOAD_COMPLETE', url: publicUrl }));
              uploadSessions.delete(data.sessionId);
            }
          }
        }
      } catch (err) {
        console.error('WS Error:', err);
      }
    });

    ws.on('close', () => {
      if (currentUserId) {
        chatClients.delete(currentUserId);
        // Broadcast user offline
        const offlinePayload = JSON.stringify({ type: 'USER_OFFLINE', userId: currentUserId });
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(offlinePayload);
          }
        });
      }
      if (uploadSessions.size > 100) uploadSessions.clear(); // Basic cleanup
    });
  });

  console.log('Iniciando servidor...');

  app.get('/api/health', (req, res) => {
    console.log('Health check requested');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
  });

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];

  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      
      const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
      const isCloudRunPreview = origin.endsWith('.run.app') || origin.endsWith('.google.com');
      
      if (isLocalhost || isCloudRunPreview || allowedOrigins.includes(origin) || allowedOrigins.length === 0) {
        callback(null, true);
      } else {
        console.warn(`CORS barrado para origem: ${origin}`);
        callback(new Error('Não permitido pelas regras de CORS'));
      }
    },
    credentials: true
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ limit: '5mb', extended: true }));

  // --- ADMIN CUSTOM CLAIM SYNC ENDPOINT ---
  app.post('/api/auth/sync-admin', async (req, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token é obrigatório.' });
    }

    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      const email = decodedToken.email?.toLowerCase();
      
      if (email === ADMIN_EMAIL.toLowerCase()) {
        try {
          // Set custom user claims for admin
          await getAuth().setCustomUserClaims(decodedToken.uid, { admin: true });
          console.log(`Custom admin claims set successfully for user: ${email} (${decodedToken.uid})`);
        } catch (claimError: any) {
          console.warn(`Aviso: Falha ao setar custom claims no Firebase Auth (Identity Toolkit API pode estar desabilitada):`, claimError.message);
        }
        return res.json({ success: true, admin: true, message: 'Admin verificado (claims sync ignorado/fallback ativo).' });
      } else {
        try {
          // Ensure no leftover admin claim for other users (for security, or if they changed emails)
          await getAuth().setCustomUserClaims(decodedToken.uid, { admin: false });
        } catch (claimError: any) {
          // Ignore
        }
        return res.json({ success: true, admin: false, message: 'Non-admin user, claim ensured false.' });
      }
    } catch (error: any) {
      console.warn('Aviso na rota /api/auth/sync-admin (processado de forma segura):', error.message);
      res.json({ success: false, error: 'Erro ao processar claims de admin, utilizando fallback offline', details: error.message });
    }
  });

  // --- GEMINI PROXY CHAT ENDPOINT ---
  app.post('/api/chat', async (req, res) => {
    const { messages, gameTitle } = req.body;
    if (!messages || !Array.isArray(messages) || !gameTitle) {
      return res.status(400).json({ error: 'Parâmetros inválidos: messages e gameTitle são obrigatórios.' });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Chave de API GEMINI_API_KEY não configurada no servidor.');
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const model = "gemini-3.5-flash";
      const systemInstruction = `Você é um assistente especialista em videogames, focado especificamente no jogo "${gameTitle}". 
      Sua missão é ajudar o jogador com dicas, estratégias, localização de itens e guias de conquistas.
      Seja amigável, use termos de gamer e mantenha as respostas concisas e úteis.
      Se o jogador perguntar algo fora do contexto de "${gameTitle}", tente gentilmente trazer o assunto de volta para o jogo ou diga que seu conhecimento é focado neste título.`;

      const sdkContents = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model,
        contents: sdkContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const text = response.text || 'Desculpe, tive um problema ao processar sua resposta. Pode tentar novamente?';
      res.json({ text });
    } catch (error: any) {
      console.error('Erro na rota /api/chat:', error);
      res.status(500).json({ error: 'Erro ao gerar conteúdo com Gemini', details: error.message });
    }
  });

  // --- STEAM AUTH & API PROXY ---
  app.get('/api/auth/steam/url', (req, res) => {
    let appUrl = process.env.APP_URL;
    
    // Dynamic detection if APP_URL is not set or is localhost but request is remote
    if (!appUrl || (appUrl.includes('localhost') && req.headers.host && !req.headers.host.includes('localhost'))) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      appUrl = `${protocol}://${host}`;
      console.log(`Using dynamic APP_URL for Steam: ${appUrl}`);
    }

    const redirectUri = `${appUrl}/api/auth/steam/callback`;
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': redirectUri,
      'openid.realm': appUrl,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    });
    const authUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;
    res.json({ url: authUrl });
  });

  app.get('/api/auth/steam/callback', async (req, res) => {
    try {
      const params = req.query;
      const verifyParams = new URLSearchParams(params as any);
      verifyParams.set('openid.mode', 'check_authentication');
      
      const response = await fetch('https://steamcommunity.com/openid/login', {
        method: 'POST',
        body: verifyParams.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const text = await response.text();
      console.log('Steam OpenID Verification Response:', text);
      const isValid = text.includes('is_valid:true');
      
      if (isValid) {
        const claimedId = params['openid.claimed_id'] as string;
        const steamId = claimedId.split('/').pop();
        console.log('Steam ID extracted:', steamId);
        
        if (!steamId) {
          console.error('Steam ID not found in claimed_id:', claimedId);
          return res.status(400).send('Steam ID não encontrado na resposta');
        }

        res.send(`
          <html>
            <body style="background: #0d1117; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
              <div style="text-align: center; padding: 20px; border-radius: 12px; background: #171a21; border: 1px solid #2a475e;">
                <h2 style="color: #66c0f4; margin-bottom: 10px;">Autenticação Steam Concluída!</h2>
                <p style="color: #8f98a0;">Sincronizando dados... Esta janela fechará automaticamente.</p>
                <div style="margin-top: 20px; height: 4px; background: #2a475e; border-radius: 2px; overflow: hidden;">
                  <div style="height: 100%; background: #66c0f4; width: 50%; animation: loading 2s infinite ease-in-out;"></div>
                </div>
                <style>
                  @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                  }
                </style>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({ 
                      type: 'STEAM_AUTH_SUCCESS', 
                      steamId: '${steamId}'
                    }, '*');
                    setTimeout(() => window.close(), 1500);
                  } else {
                    window.location.href = '/';
                  }
                </script>
              </div>
            </body>
          </html>
        `);
      } else {
        console.error('Steam OpenID validation failed. Response text:', text);
        res.status(400).send('Falha na autenticação Steam: Resposta inválida do servidor Steam');
      }
    } catch (error) {
      console.error('Steam Auth Callback Error:', error);
      res.status(500).send('Erro interno na autenticação Steam');
    }
  });

  app.get('/api/steam/config', (req, res) => {
    const apiKey = process.env.STEAM_API_KEY;
    const isConfigured = !!apiKey && apiKey !== 'your_steam_api_key_here';
    res.json({ isConfigured });
  });

  app.get('/api/steam/owned-games/:steamId', async (req, res) => {
    const { steamId } = req.params;
    const apiKey = process.env.STEAM_API_KEY;
    
    if (!apiKey || apiKey === 'your_steam_api_key_here') {
      return res.status(500).json({ 
        error: 'STEAM_API_KEY não configurada no servidor.' 
      });
    }
    
    try {
      const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json&include_appinfo=1`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Steam API error response (${response.status}):`, errorBody);
        
        if (response.status === 403) {
          return res.status(403).json({ error: 'Acesso negado pela Steam. Verifique se o seu perfil e os "Detalhes do Jogo" estão configurados como "Público" nas configurações de privacidade da Steam.' });
        }
        
        return res.status(response.status).json({ error: `Erro na API da Steam (${response.status}) ao buscar biblioteca.` });
      }

      const data = await response.json();
      
      if (data.response && data.response.games) {
        res.json(data.response.games);
      } else {
        console.warn('Steam API owned games empty response:', data);
        res.status(400).json({ 
          error: 'A Steam não retornou nenhum jogo. Verifique se o seu perfil e os "Detalhes do Jogo" estão configurados como "Público".' 
        });
      }
    } catch (error) {
      console.error('Steam API Error:', error);
      res.status(500).json({ error: 'Erro ao consultar API da Steam' });
    }
  });

  app.get('/api/steam/achievements/:steamId/:appId', async (req, res) => {
    const { steamId, appId } = req.params;
    const apiKey = process.env.STEAM_API_KEY;
    
    if (!apiKey || apiKey === 'your_steam_api_key_here') {
      return res.status(500).json({ 
        error: 'STEAM_API_KEY não configurada no servidor. Por favor, adicione sua Steam Web API Key nas configurações do projeto.' 
      });
    }
    
    try {
      const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${apiKey}&steamid=${steamId}&l=portuguese`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Steam API error response (${response.status}):`, errorBody);
        
        if (response.status === 403) {
          return res.status(403).json({ error: 'Acesso negado pela Steam. Verifique se o seu perfil e os detalhes do jogo estão configurados como "Público" nas configurações de privacidade da Steam.' });
        }
        
        return res.status(response.status).json({ error: `Erro na API da Steam (${response.status}). Verifique se o ID do jogo e o seu SteamID estão corretos.` });
      }

      const data = await response.json();
      
      if (data.playerstats && data.playerstats.success) {
        const achievements = data.playerstats.achievements || [];
        const unlocked = achievements.filter((a: any) => a.achieved === 1);
        res.json(unlocked);
      } else {
        const steamError = data.playerstats?.error || 'Erro desconhecido';
        console.warn('Steam API success false:', steamError);
        res.status(400).json({ 
          error: `A Steam retornou um erro: ${steamError}. Certifique-se de que você possui o jogo e que seu perfil é público.` 
        });
      }
    } catch (error) {
      console.error('Steam API Error:', error);
      res.status(500).json({ error: 'Erro ao consultar API da Steam' });
    }
  });

  app.get('/api/steam/game-schema/:appId', async (req, res) => {
    const { appId } = req.params;
    const apiKey = process.env.STEAM_API_KEY;
    
    if (!apiKey || apiKey === 'your_steam_api_key_here') {
      return res.status(500).json({ 
        error: 'STEAM_API_KEY não configurada no servidor.' 
      });
    }
    
    try {
      const url = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${apiKey}&appid=${appId}&l=portuguese`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: `Erro na API da Steam (${response.status}) ao buscar esquema do jogo.` });
      }

      const data = await response.json();
      
      if (data.game && data.game.availableGameStats && data.game.availableGameStats.achievements) {
        res.json(data.game.availableGameStats.achievements);
      } else {
        res.status(400).json({ error: 'A Steam não retornou conquistas para este AppID. Verifique se o ID está correto.' });
      }
    } catch (error) {
      console.error('Steam API Error:', error);
      res.status(500).json({ error: 'Erro ao consultar API da Steam' });
    }
  });

  app.get('/api/steam/achievement-percentages/:appId', async (req, res) => {
    const { appId } = req.params;
    const apiKey = process.env.STEAM_API_KEY;
    
    try {
      const keyParam = (apiKey && apiKey !== 'your_steam_api_key_here') ? `&key=${apiKey}` : '';
      const url = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${appId}${keyParam}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: `Erro na API da Steam (${response.status}) ao buscar percentuais de conquistas.` });
      }

      const data = await response.json();
      
      if (data.achievementpercentages && data.achievementpercentages.achievements) {
        const list = data.achievementpercentages.achievements.map((item: any) => ({
          name: item.name,
          percent: Number(item.percent)
        }));
        res.json(list);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error('Steam Achievement Percentages Error:', error);
      res.status(500).json({ error: 'Erro ao consultar percentuais de conquistas da Steam' });
    }
  });

  // --- SUBSCRIPTION STUB ENDPOINT ---
  app.get('/api/subscription/status', (req, res) => {
    res.json({
      plan: 'free',
      status: 'active',
      expiresAt: null
    });
  });

  // --- IMAGE TILING API ---
  app.post('/api/tile-image', async (req, res) => {
    const { imageUrl, mapId } = req.body;
    if (!imageUrl || !mapId) {
      return res.status(400).json({ error: 'imageUrl and mapId are required' });
    }

    try {
      const targetDir = path.join(tilesDir, mapId);
      
      // Check if already tiled
      if (fs.existsSync(targetDir)) {
        let width = 2000;
        let height = 2000;
        const infoPath = path.join(targetDir, 'info.json');
        if (fs.existsSync(infoPath)) {
          try {
            const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
            width = info.width;
            height = info.height;
          } catch (e) {
            console.error('Error reading info.json:', e);
          }
        }
        return res.json({ baseUrl: `/tiles/${mapId}`, width, height });
      }

      // If imageUrl is local (starts with /uploads), use local path
      let imageSource: string | Buffer;
      if (imageUrl.startsWith('/uploads/')) {
        imageSource = path.join(__dirname, 'public', imageUrl.replace(/^\//, ''));
        if (!fs.existsSync(imageSource)) {
          console.warn(`Tiling skipped: Local file not found at ${imageSource}, searching for fallback...`);
          try {
            const files = fs.readdirSync(uploadsDir).filter(file => {
              const ext = path.extname(file).toLowerCase();
              return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
            });
            if (files.length > 0) {
              imageSource = path.join(uploadsDir, files[0]);
              console.log(`Using fallback image for tiling: ${imageSource}`);
            } else {
              return res.status(404).json({ error: 'Local image file not found', path: imageUrl });
            }
          } catch (e) {
            return res.status(404).json({ error: 'Local image file not found', path: imageUrl });
          }
        }
      } else {
        // Validate external URL to prevent SSRF
        const isSafe = await validateUrlForSsrf(imageUrl);
        if (!isSafe) {
          console.error(`Blocked SSRF attempt or invalid URL: ${imageUrl}`);
          return res.status(400).json({ error: 'URL inválida ou proibida por questões de segurança (SSRF).' });
        }

        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        imageSource = Buffer.from(arrayBuffer);
      }

      console.log(`Getting metadata for map ${mapId}...`);
      const metadata = await sharp(imageSource).metadata();
      const width = metadata.width || 2000;
      const height = metadata.height || 2000;

      console.log(`Tiling image for map ${mapId}...`);
      
      // Generate tiles using sharp with Google layout (compatible with Leaflet)
      // This creates a directory structure: {z}/{x}/{y}.png
      await sharp(imageSource, { limitInputPixels: false })
        .tile({
          size: 256,
          layout: 'google',
          container: 'fs'
        })
        .toFile(targetDir);

      // Save metadata size inside the directory
      const info = { width, height };
      fs.writeFileSync(path.join(targetDir, 'info.json'), JSON.stringify(info));

      console.log(`Tiling complete for map ${mapId}`);
      res.json({ baseUrl: `/tiles/${mapId}`, width, height });
    } catch (error) {
      console.error('Tiling error:', error);
      res.status(500).json({ error: 'Failed to tile image', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  });

  // Serve uploaded files with dynamic fallback to prevent image loading errors in stateless environments
  app.get('/uploads/:filename', (req, res, next) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.sendFile(filePath);
    } else {
      console.warn(`File ${filename} not found in uploads. Finding fallback...`);
      try {
        const files = fs.readdirSync(uploadsDir).filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) && file !== filename;
        });

        if (files.length > 0) {
          const fallbackPath = path.join(uploadsDir, files[0]);
          console.log(`Serving fallback image: ${files[0]} for requested: ${filename}`);
          res.sendFile(fallbackPath);
        } else {
          res.status(404).send('Image not found');
        }
      } catch (err) {
        console.error('Error finding fallback image:', err);
        res.status(404).send('Image not found');
      }
    }
  });

  app.use('/uploads', express.static(uploadsDir));
  app.use('/tiles', express.static(tilesDir));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
