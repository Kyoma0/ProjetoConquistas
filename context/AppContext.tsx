
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Game, GameContextType, User, UserAchievementProgress, AchievementStatus, Achievement, Content, PendingValidation, ValidationLog, UserGoal, ToastMessage, Feedback, ProfileWallpaper, RewardRoomSettings, SystemSettings, StoreItem, GameEvent, Message, Transaction, FriendRequest, CommunityGroup, CommunityPost, CommunityMember, GeneralNotification, DeviceType, Viewport, LevelConfig, SubPage } from '../types';
import { ADMIN_EMAIL, INITIAL_WALLPAPERS } from '../constants';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { 
  auth, db, googleProvider,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail,
  signInWithPopup,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  getDocFromServer,
  addDoc,
  deleteDoc,
  orderBy,
  limit,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment,
  collectionGroup,
  deleteField
} from '../firebase';
import { handleFirestoreError, OperationType, FirestoreErrorInfo } from '../firebase';
import { api } from '../backend';

const AppContext = createContext<GameContextType | undefined>(undefined);

const DEFAULT_REWARD_SETTINGS: RewardRoomSettings = {
  rewardAmount: 1.00,
  adDuration: 15,
  adTitle: "Campanha Especial Master",
  adDescription: "Assista este anúncio rápido para fortalecer sua jornada caçadora.",
  isActive: true,
  videoUrl: ""
};

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  isCatalogEnabled: true,
  isLibraryEnabled: true,
  isStoreEnabled: true,
  isLivesEnabled: true,
  isFavoritesEnabled: true,
  isEventsEnabled: true,
  isExtrasEnabled: false
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [subPages, setSubPages] = useState<SubPage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [wallpapers, setWallpapers] = useState<ProfileWallpaper[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, UserAchievementProgress>>({});
  const [validationLogs, setValidationLogs] = useState<ValidationLog[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoal[]>([]);
  const [pendingValidations, setPendingValidations] = useState<PendingValidation[]>([]);
  const [rewardSettings, setRewardSettings] = useState<RewardRoomSettings>(DEFAULT_REWARD_SETTINGS);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [communityGroups, setCommunityGroups] = useState<CommunityGroup[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [myCommunityMemberships, setMyCommunityMemberships] = useState<CommunityMember[]>([]);
  const [generalNotifications, setGeneralNotifications] = useState<GeneralNotification[]>([]);
  const [myReadNotifications, setMyReadNotifications] = useState<string[]>([]);
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [isTouch, setIsTouch] = useState(false);
  const [viewport, setViewport] = useState<Viewport>({ width: window.innerWidth, height: window.innerHeight });
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setViewport({ width, height });
      
      if (width < 768) setDeviceType('mobile');
      else if (width < 1024) setDeviceType('tablet');
      else setDeviceType('desktop');
      
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingUser, setPendingUser] = useState<{ uid: string; email: string | null; photoURL: string | null; displayName: string | null } | null>(null);

  // Firebase Auth Listener
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Sync custom admin claims on server
          try {
            const token = await firebaseUser.getIdToken();
            const syncRes = await fetch('/api/auth/sync-admin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token })
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (syncData.admin) {
                // Force token refresh to make sure custom claim is visible in future request headers / firebase calls
                await firebaseUser.getIdToken(true);
              }
            }
          } catch (syncErr) {
            console.error("Erro ao sincronizar claims de admin no servidor:", syncErr);
          }

          // Initial fetch
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid)).catch(e => handleFirestoreError(e, OperationType.GET, `users/${firebaseUser.uid}`));
          if (userDoc.exists()) {
            const data = userDoc.data() as User;
            if (data.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (!data.isAdmin || !data.isVip)) {
              const updatedData = { ...data, isAdmin: true, isVip: true };
              await updateDoc(doc(db, 'users', firebaseUser.uid), { isAdmin: true, isVip: true }).catch(console.error);
              setCurrentUser(updatedData);
            } else {
              setCurrentUser(data);
            }
            setPendingUser(null);
          } else {
            setPendingUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              displayName: firebaseUser.displayName
            });
          }

          // Set up real-time listener for the current user
          const userUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as User;
              if (data.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (!data.isAdmin || !data.isVip)) {
                setCurrentUser({ ...data, isAdmin: true, isVip: true });
              } else {
                setCurrentUser(data);
              }
            }
          }, (error) => {
            console.error("Error in user real-time listener:", error, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              authReady: isAuthReady,
              path: `users/${firebaseUser.uid}`
            });
          });

          // Store unsubscribe in a way we can clean up if needed, 
          // though onAuthStateChanged cleanup usually handles it if we manage it right.
          // For simplicity, we'll just let it run as long as the auth state is valid.

        } catch (err) {
          console.error("Error fetching user data:", err);
          if (!(err instanceof Error && err.message.includes('Firestore Error'))) {
             showToast("Erro ao carregar dados do usuário.", "error");
          }
        }
      } else {
        setCurrentUser(null);
        setPendingUser(null);
      }
      setIsLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info', onClick?: () => void) => {
    const options = onClick ? { action: { label: 'Abrir', onClick } } : {};
    if (type === 'success') toast.success(message, options);
    else if (type === 'error') toast.error(message, options);
    else toast.info(message, options);
  };

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    
    let userMessage = "Erro de permissão ou conexão com o banco de dados.";
    if (errInfo.error.includes("permission-denied")) {
      userMessage = "Você não tem permissão para realizar esta ação.";
    } else if (errInfo.error.includes("unavailable")) {
      userMessage = "Serviço temporariamente indisponível. Verifique sua conexão.";
    }
    showToast(userMessage, "error");
    
    throw new Error(JSON.stringify(errInfo));
  };

  // Remove localStorage sync as Firebase handles persistence
  useEffect(() => {
    // No-op
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && currentUser.isVip && currentUser.vipUntil) {
      if (new Date(currentUser.vipUntil) < new Date()) {
        updateUser(currentUser.id, { isVip: false, vipUntil: undefined });
        showToast("Seu status VIP expirou.", "info");
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribes: (() => void)[] = [];

    const syncWithBackend = () => {
      setIsLoading(true);
      try {
        const collectionsToSync = [
          { name: 'games', setter: setGames as (data: any[]) => void },
          { name: 'achievements', setter: setAchievements as (data: any[]) => void },
          { name: 'storeItems', setter: setStoreItems as (data: any[]) => void },
          { name: 'events', setter: setEvents as (data: any[]) => void },
          { name: 'communityGroups', setter: setCommunityGroups as (data: any[]) => void },
          { name: 'generalNotifications', setter: setGeneralNotifications as (data: any[]) => void },
          { name: 'levels', setter: setLevels as (data: any[]) => void },
          { name: 'contents', setter: setContents as (data: any[]) => void },
          { name: 'subPages', setter: setSubPages as (data: any[]) => void },
          { name: 'wallpapers', setter: setWallpapers as (data: any[]) => void },
        ];

        collectionsToSync.forEach(col => {
          const unsub = onSnapshot(collection(db, col.name), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            col.setter(data);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, col.name);
          });
          unsubscribes.push(unsub);
        });

        // Feedbacks - Admin only
        if (currentUser?.isAdmin) {
          const unsubFeedbacks = onSnapshot(collection(db, 'feedbacks'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Feedback));
            setFeedbacks(data);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'feedbacks');
          });
          unsubscribes.push(unsubFeedbacks);
        }

        // Special handling for settings
        const unsubSettings = onSnapshot(doc(db, 'settings', 'app'), (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.rewardSettings) setRewardSettings(data.rewardSettings);
            if (data.systemSettings) setSystemSettings(data.systemSettings);
          }
        }, (error) => {
          console.error("Erro ao sincronizar configurações:", error);
        });
        unsubscribes.push(unsubSettings);

        // User specific data
        if (currentUser) {
          // Progress
          const unsubProgress = onSnapshot(collection(db, `users/${currentUser.id}/progress`), (snapshot) => {
            const progress: Record<string, UserAchievementProgress> = {};
            snapshot.docs.forEach(doc => {
              progress[doc.id] = doc.data() as UserAchievementProgress;
            });
            setUserProgress(progress);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${currentUser.id}/progress`);
          });
          unsubscribes.push(unsubProgress);

          // Messages
          const unsubMessages = onSnapshot(
            query(collection(db, 'messages'), 
            where('participants', 'array-contains', currentUser.id),
            orderBy('timestamp', 'desc')), 
            (snapshot) => {
              const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
              setMessages(msgs);
              
              const counts: Record<string, number> = {};
              msgs.forEach((m: Message) => {
                if (m.receiverId === currentUser.id && !m.isRead) {
                  counts[m.senderId] = (counts[m.senderId] || 0) + 1;
                }
              });
              setUnreadCounts(counts);
            }, (error) => {
              handleFirestoreError(error, OperationType.LIST, 'messages');
            }
          );
          unsubscribes.push(unsubMessages);

          // Friend Requests
          const unsubFR = onSnapshot(
            query(collection(db, 'friendRequests'), 
            where('participants', 'array-contains', currentUser.id)), 
            (snapshot) => {
              const frs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FriendRequest[];
              setFriendRequests(frs);
            }, (error) => {
              handleFirestoreError(error, OperationType.LIST, 'friendRequests');
            }
          );
          unsubscribes.push(unsubFR);

          // Read Notifications
          const unsubReadNotifs = onSnapshot(doc(db, `users/${currentUser.id}/private`, 'notifications'), (snapshot) => {
            if (snapshot.exists()) {
              setMyReadNotifications(snapshot.data().readIds || []);
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.id}/private/notifications`);
          });
          unsubscribes.push(unsubReadNotifs);

          // Community Memberships (Collection Group Query or iterate groups)
          // For now, let's just sync posts globally if they are not too many
          const unsubPosts = onSnapshot(query(collectionGroup(db, 'posts'), orderBy('createdAt', 'desc')), (snapshot) => {
            const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommunityPost[];
            setCommunityPosts(posts);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'community_posts');
          });
          unsubscribes.push(unsubPosts);

          // User Goals
          const unsubGoals = onSnapshot(query(collection(db, 'goals'), where('userId', '==', currentUser.id)), (snapshot) => {
            const goals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserGoal[];
            setUserGoals(goals);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'goals');
          });
          unsubscribes.push(unsubGoals);

          // Pending Validations
          const pendingValidationsQuery = currentUser.isAdmin 
            ? collection(db, 'pendingValidations')
            : query(collection(db, 'pendingValidations'), where('userId', '==', currentUser.id));
          
          const unsubPending = onSnapshot(pendingValidationsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PendingValidation[];
            setPendingValidations(data);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'pendingValidations');
          });
          unsubscribes.push(unsubPending);

          // Validation Logs
          const validationLogsQuery = currentUser.isAdmin
            ? collection(db, 'validationLogs')
            : query(collection(db, 'validationLogs'), where('userId', '==', currentUser.id));

          const unsubLogs = onSnapshot(validationLogsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ValidationLog[];
            setValidationLogs(data);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'validationLogs');
          });
          unsubscribes.push(unsubLogs);

          // Community Memberships
          const unsubMemberships = onSnapshot(collectionGroup(db, 'members'), (snapshot) => {
            const memberships = snapshot.docs
              .map(doc => {
                const data = doc.data();
                return {
                  groupId: data.groupId || '',
                  userId: data.userId || '',
                  role: data.role || 'member',
                  isBanned: data.isBanned || false,
                  bannedAt: data.bannedAt,
                  bannedBy: data.bannedBy,
                } as CommunityMember;
              })
              .filter((m) => m.userId === currentUser.id);
            setMyCommunityMemberships(memberships);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'community_memberships');
          });
          unsubscribes.push(unsubMemberships);
        }

      } catch (err) {
        console.error("Erro ao sincronizar dados:", err);
      } finally {
        setIsLoading(false);
      }
    };

    syncWithBackend();
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [currentUser?.id, currentUser?.isAdmin]);

  // Real-time Users from Firestore
  useEffect(() => {
    if (!currentUser) {
      setUsers([]);
      return;
    }
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const updatedUsers = snapshot.docs.map(doc => doc.data() as User);
      setUsers(updatedUsers);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  // WebSocket Setup
  useEffect(() => {
    if (!currentUser) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.onopen = async () => {
      console.log('WS Connected');
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          socket.send(JSON.stringify({ type: 'IDENTIFY', userId: currentUser.id, token }));
        } else {
          socket.send(JSON.stringify({ type: 'IDENTIFY', userId: currentUser.id }));
        }
      } catch (err) {
        console.error("Erro ao obter idToken do usuário para identificação do WS:", err);
        socket.send(JSON.stringify({ type: 'IDENTIFY', userId: currentUser.id }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_MESSAGE') {
          const msg = data.message;
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          if (msg.receiverId === currentUser.id) {
            setUnreadCounts(prev => ({
              ...prev,
              [msg.senderId]: (prev[msg.senderId] || 0) + 1
            }));
            const sender = users.find(u => u.id === msg.senderId);
            showToast(`Nova mensagem de ${sender?.name || 'Amigo'}!`, 'info', () => {
              window.dispatchEvent(new CustomEvent('open-chat', { detail: { userId: msg.senderId } }));
            });
          }
        } else if (data.type === 'USER_ONLINE') {
          setOnlineUsers(prev => prev.includes(data.userId) ? prev : [...prev, data.userId]);
        } else if (data.type === 'USER_OFFLINE') {
          setOnlineUsers(prev => prev.filter(id => id !== data.userId));
        } else if (data.type === 'ONLINE_USERS_LIST') {
          setOnlineUsers(data.users);
        } else if (data.type === 'FRIEND_REQUEST_ACCEPTED') {
          // Refresh users and current user if involved
          if (data.senderId === currentUser.id || data.receiverId === currentUser.id) {
            showToast("Um pedido de amizade foi aceito!", "success");
          }
        }
      } catch (err) {
        console.error('WS Message Error:', err);
      }
    };

    socket.onclose = () => console.log('WS Disconnected');
    setWs(socket);

    return () => socket.close();
  }, [currentUser?.id]);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Login realizado com sucesso!", "success");
    } catch (err: any) {
      let msg = "Erro ao realizar login.";
      if (err.code === 'auth/user-not-found') msg = "Usuário não encontrado.";
      if (err.code === 'auth/wrong-password') msg = "Senha incorreta.";
      if (err.code === 'auth/invalid-email') msg = "E-mail inválido.";
      showToast(msg, "error");
    }
  };

  const loginWithOAuth = async (userData: User | null, oauthData: { email?: string, name?: string, avatar?: string, steamId?: string }) => {
    try {
      // If it's Google OAuth via Firebase
      if (!oauthData.steamId) {
        await signInWithPopup(auth, googleProvider);
        return;
      }

      // Existing Steam OAuth logic (keep it for now as it uses the backend)
      if (userData) {
        if (userData.isBanned) {
          showToast("Conta suspensa.", "error");
          return;
        }
        setCurrentUser(userData);
        showToast(`Bem-vindo, ${userData.name}!`, "success");
      } else {
        // Create new user or link if email exists
        let existingUser = oauthData.email ? users.find(u => u.email.toLowerCase() === oauthData.email?.toLowerCase()) : null;
        
        if (!existingUser && oauthData.steamId) {
          existingUser = users.find(u => u.steamId === oauthData.steamId);
        }
        
        if (existingUser) {
          const updatedUser = { ...existingUser, steamId: oauthData.steamId || existingUser.steamId };
          updateUser(existingUser.id, updatedUser);
          setCurrentUser(updatedUser);
          showToast(`Conta vinculada e logada como ${existingUser.name}!`, "success");
          return;
        }

        const name = oauthData.name || (oauthData.steamId ? `SteamUser_${oauthData.steamId.slice(-4)}` : 'Novo Usuário');
        const email = oauthData.email || `${oauthData.steamId || Date.now()}@oauth.placeholder`;
        
        const newUser: User = {
          id: `u_${Date.now()}`,
          email: email.toLowerCase(),
          name: name,
          avatar: oauthData.avatar || `https://ui-avatars.com/api/?name=${name}&background=66c0f4&color=fff&bold=true`,
          isAdmin: email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
          isBanned: false,
          isVip: false,
          libraryGameIds: [],
          favoriteGameIds: [],
          friendIds: [],
          ownedItemIds: [],
          balance: 0,
          xp: 0,
          steamId: oauthData.steamId
        };
        
        await setDoc(doc(db, 'users', newUser.id), newUser).catch(e => handleFirestoreError(e, OperationType.CREATE, `users/${newUser.id}`));
        setUsers(prev => [...prev, newUser]);
        setCurrentUser(newUser);
        showToast("Conta criada via OAuth com sucesso!", "success");
      }
    } catch (err: any) {
      showToast("Erro no login social.", "error");
    }
  };

  const register = async (email: string, name: string, password: string) => {
    console.log("Iniciando processo de cadastro para:", email);
    if (password.length < 8) {
      showToast("A senha deve ter pelo menos 8 caracteres.", "error");
      return;
    }
    try {
      showToast("Criando sua conta...", "info");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log("Usuário Firebase criado:", firebaseUser.uid);
      
      const newUser: User = {
        id: firebaseUser.uid,
        email: email.toLowerCase(),
        name: name,
        avatar: `https://ui-avatars.com/api/?name=${name}&background=66c0f4&color=fff&bold=true`,
        isAdmin: email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
        isBanned: false,
        isVip: email.toLowerCase() === ADMIN_EMAIL.toLowerCase(), 
        libraryGameIds: [],
        favoriteGameIds: [],
        friendIds: [],
        ownedItemIds: [],
        balance: 0,
        xp: 0
      };
      
      console.log("Salvando dados do usuário no Firestore...");
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        setCurrentUser(newUser);
        showToast("Cadastro concluído com sucesso!", "success");
      } catch (firestoreErr: any) {
        console.error("Erro ao salvar no Firestore:", firestoreErr);
        handleFirestoreError(firestoreErr, OperationType.CREATE, `users/${firebaseUser.uid}`);
      }
    } catch (err: any) {
      const isExpectedAuthError = [
        'auth/email-already-in-use',
        'auth/invalid-email',
        'auth/weak-password',
        'auth/operation-not-allowed'
      ].includes(err.code);

      if (isExpectedAuthError) {
        console.warn("Aviso no processo de cadastro:", err);
      } else {
        console.error("Erro no processo de cadastro:", err);
      }
      
      let msg = "Erro ao cadastrar.";
      if (err.code === 'auth/email-already-in-use') msg = "Este e-mail já está em uso.";
      else if (err.code === 'auth/invalid-email') msg = "E-mail inválido.";
      else if (err.code === 'auth/weak-password') msg = "Senha muito fraca.";
      else if (err.code === 'auth/operation-not-allowed') {
        msg = "O cadastro por e-mail está desativado no Firebase. Por favor, use o Login com Google ou ative 'E-mail/Senha' no Console do Firebase.";
      } else if (err.message?.includes('Firestore Error')) {
        return; // Already handled
      }
      
      showToast(msg, "error");
    }
  };

  const completeRegistration = async (nickname: string) => {
    if (!pendingUser) return;
    
    try {
      const newUser: User = {
        id: pendingUser.uid,
        email: pendingUser.email || '',
        name: nickname,
        avatar: pendingUser.photoURL || `https://ui-avatars.com/api/?name=${nickname}&background=66c0f4&color=fff&bold=true`,
        isAdmin: pendingUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
        isBanned: false,
        isVip: pendingUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
        libraryGameIds: [],
        favoriteGameIds: [],
        friendIds: [],
        ownedItemIds: [],
        balance: 0,
        xp: 0
      };
      
      await setDoc(doc(db, 'users', pendingUser.uid), newUser).catch(e => handleFirestoreError(e, OperationType.CREATE, `users/${pendingUser.uid}`));
      setCurrentUser(newUser);
      setPendingUser(null);
      showToast("Cadastro concluído com sucesso!", "success");
    } catch (err) {
      console.error("Error completing registration:", err);
      showToast("Erro ao concluir cadastro.", "error");
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      showToast("E-mail de recuperação enviado!", "success");
    } catch (err: any) {
      showToast("Erro ao enviar e-mail de recuperação.", "error");
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    // Firebase handles reset via link in email
    showToast("Use o link enviado para o seu e-mail para redefinir a senha.", "info");
  };

  const logout = async () => { 
    try {
      await signOut(auth);
      setCurrentUser(null); 
      showToast("Sessão encerrada.", "info"); 
    } catch (err) {
      showToast("Erro ao sair.", "error");
    }
  };

  const updateUser = async (id: string, data: Partial<User>) => { 
    try {
      await updateDoc(doc(db, 'users', id), data).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${id}`));
      // Local state will be updated by onSnapshot
    } catch (err) {
      console.error("Error updating user:", err);
      if (!(err instanceof Error && err.message.includes('Firestore Error'))) {
        showToast("Erro ao atualizar usuário.", "error");
      }
    }
  };

  const addBalance = async (amount: number, description: string = "Recompensa", type: Transaction['type'] = 'REWARD') => {
    if (!currentUser) return;
    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.id,
      amount,
      type,
      description,
      timestamp: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'transactions', tx.id), tx);
      await updateDoc(doc(db, 'users', currentUser.id), { 
        balance: increment(amount) 
      });
      showToast(`R$ ${amount.toFixed(2)} adicionados ao seu saldo!`, "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `transactions/${tx.id}`);
    }
  };

  const sendMessage = async (receiverId: string, text: string) => {
    if (!currentUser) return;
    const msg: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      receiverId,
      participants: [currentUser.id, receiverId],
      text,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    try {
      await setDoc(doc(db, 'messages', msg.id), msg);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `messages/${msg.id}`);
    }
  };

  const markMessagesAsRead = async (senderId: string) => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, 'messages'),
        where('senderId', '==', senderId),
        where('receiverId', '==', currentUser.id),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'messages');
    }
  };

  const adminAddBalance = async (userId: string, amount: number) => {
    if (!currentUser?.isAdmin) return;
    
    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      userId,
      amount,
      type: 'ADMIN_ADD',
      description: 'Adição manual por administrador',
      timestamp: new Date().toISOString()
    };
    
    try {
      await setDoc(doc(db, 'transactions', tx.id), tx);
      await updateDoc(doc(db, 'users', userId), { 
        balance: increment(amount) 
      });
      
      await addDoc(collection(db, 'adminBalanceLogs'), {
        adminId: currentUser.id,
        userId,
        amount,
        timestamp: new Date().toISOString()
      });
      
      showToast(`R$ ${amount.toFixed(2)} adicionados ao saldo do usuário.`, "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'admin_balance_logs');
    }
  };

  // --- Communities Functions ---
  const createCommunityGroup = async (name: string, description: string, imageUrl?: string) => {
    if (!currentUser) return;
    const newGroup: CommunityGroup = {
      id: `group_${Date.now()}`,
      name,
      description,
      ownerUserId: currentUser.id,
      imageUrl,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    try {
      await setDoc(doc(db, 'communityGroups', newGroup.id), newGroup);
      // Add owner as admin member
      await setDoc(doc(db, `communityGroups/${newGroup.id}/members`, currentUser.id), {
        groupId: newGroup.id,
        userId: currentUser.id,
        role: 'admin',
        isBanned: false
      });
      showToast("Grupo criado com sucesso!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `communityGroups/${newGroup.id}`);
    }
  };

  const joinCommunityGroup = async (groupId: string) => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, `communityGroups/${groupId}/members`, currentUser.id), {
        groupId,
        userId: currentUser.id,
        role: 'member',
        isBanned: false
      });
      showToast("Você entrou no grupo!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `communityGroups/${groupId}/members/${currentUser.id}`);
    }
  };

  const leaveCommunityGroup = async (groupId: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, `communityGroups/${groupId}/members`, currentUser.id));
      showToast("Você saiu do grupo.", "info");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `communityGroups/${groupId}/members/${currentUser.id}`);
    }
  };

  const banUserFromGroup = async (groupId: string, userId: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, `communityGroups/${groupId}/members`, userId), {
        isBanned: true,
        bannedAt: new Date().toISOString(),
        bannedBy: currentUser.id
      });
      showToast("Usuário banido do grupo.", "info");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `communityGroups/${groupId}/members/${userId}`);
    }
  };

  const unbanUserFromGroup = async (groupId: string, userId: string) => {
    try {
      await updateDoc(doc(db, `communityGroups/${groupId}/members`, userId), {
        isBanned: false,
        bannedAt: deleteField(),
        bannedBy: deleteField()
      });
      showToast("Usuário desbanido do grupo.", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `communityGroups/${groupId}/members/${userId}`);
    }
  };

  const deleteCommunityGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, 'communityGroups', groupId));
      showToast("Grupo excluído.", "info");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `communityGroups/${groupId}`);
    }
  };

  const createCommunityPost = async (groupId: string, title: string, content: string) => {
    if (!currentUser) return;
    const postId = `post_${Date.now()}`;
    const newPost: CommunityPost = {
      id: postId,
      groupId,
      userId: currentUser.id,
      title,
      content,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, `communityGroups/${groupId}/posts`, newPost.id), newPost);
      showToast("Post criado com sucesso!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `communityGroups/${groupId}/posts/${newPost.id}`);
    }
  };

  const getCommunityMembers = async (groupId: string): Promise<CommunityMember[]> => {
    try {
      const snapshot = await getDocs(collection(db, `communityGroups/${groupId}/members`));
      return snapshot.docs.map(doc => doc.data() as CommunityMember);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `communityGroups/${groupId}/members`);
      return [];
    }
  };

  // --- General Notifications Functions ---
  const createGeneralNotification = async (title: string, message: string, link?: string, imageUrl?: string) => {
    if (!currentUser?.isAdmin) return;
    const newNotif: GeneralNotification = {
      id: `notif_${Date.now()}`,
      title,
      message,
      link,
      imageUrl,
      createdByAdminId: currentUser.id,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'generalNotifications', newNotif.id), newNotif);
      showToast("Notificação geral enviada!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `generalNotifications/${newNotif.id}`);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!currentUser) return;
    try {
      const readId = `${currentUser.id}_${notificationId}`;
      await setDoc(doc(db, 'generalNotificationsRead', readId), {
        notificationId,
        userId: currentUser.id,
        readAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `generalNotificationsRead/${currentUser.id}_${notificationId}`);
    }
  };

  const addLevel = async (level: Omit<LevelConfig, 'id' | 'createdAt'>) => {
    const newLevel: LevelConfig = { ...level, id: `lvl_${Date.now()}`, createdAt: new Date().toISOString() };
    try {
      await setDoc(doc(db, 'levels', newLevel.id), newLevel);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `levels/${newLevel.id}`);
    }
  };

  const updateLevel = async (level: LevelConfig) => {
    try {
      await setDoc(doc(db, 'levels', level.id), level);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `levels/${level.id}`);
    }
  };

  const deleteLevel = async (levelId: string) => {
    try {
      await deleteDoc(doc(db, 'levels', levelId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `levels/${levelId}`);
    }
  };

  const updateRewardSettings = async (settings: Partial<RewardRoomSettings>) => {
    const updated = { ...rewardSettings, ...settings };
    try {
      await setDoc(doc(db, 'settings', 'app'), { rewardSettings: updated }, { merge: true });
      showToast("Configurações de recompensa atualizadas!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/app');
    }
  };

  const updateSystemSettings = async (settings: Partial<SystemSettings>) => {
    const updated = { ...systemSettings, ...settings };
    try {
      await setDoc(doc(db, 'settings', 'app'), { systemSettings: updated }, { merge: true });
      showToast("Estrutura lateral atualizada!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/app');
    }
  };

  const addStoreItem = async (item: StoreItem) => {
    try {
      await setDoc(doc(db, 'storeItems', item.id), sanitize(item));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `storeItems/${item.id}`);
    }
  };

  const updateStoreItem = async (item: StoreItem) => {
    try {
      await setDoc(doc(db, 'storeItems', item.id), sanitize(item));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `storeItems/${item.id}`);
    }
  };

  const deleteStoreItem = async (id: string) => {
    console.log("AppContext: deleteStoreItem called for ID:", id);
    try {
      await deleteDoc(doc(db, 'storeItems', id));
      showToast("Item removido da loja com sucesso.", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `storeItems/${id}`);
      showToast("Falha técnica ao remover item. Tente novamente.", "error");
    }
  };

  const addEvent = async (event: GameEvent) => {
    try {
      await setDoc(doc(db, 'events', event.id), sanitize(event));
      showToast("Evento publicado com sucesso!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `events/${event.id}`);
    }
  };

  const updateEvent = async (event: GameEvent) => {
    try {
      await setDoc(doc(db, 'events', event.id), sanitize(event));
      showToast("Evento atualizado!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `events/${event.id}`);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
      showToast("Evento removido.", "info");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `events/${id}`);
      showToast("Erro ao remover evento.", "error");
    }
  };

  const toggleBanUser = async (id: string) => {
    const u = users.find(usr => usr.id === id);
    if (u) {
      const updated = { ...u, isBanned: !u.isBanned };
      await updateUser(id, updated);
      showToast(updated.isBanned ? "Usuário banido." : "Usuário reativado.", "info");
    }
  };

  const toggleAdminUser = async (id: string) => {
    const u = users.find(usr => usr.id === id);
    if (u) {
      if (u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        showToast("Não é possível alterar o Admin Raiz.", "error");
        return;
      }
      const updated = { ...u, isAdmin: !u.isAdmin };
      await updateUser(id, updated);
      showToast(updated.isAdmin ? "Usuário promovido a Sub-Admin." : "Sub-Admin rebaixado.", "success");
    }
  };

  const toggleVipUser = async (id: string, months?: number) => {
    const u = users.find(usr => usr.id === id);
    if (u) {
      let updated: Partial<User>;
      if (u.isVip && !months) {
        updated = { isVip: false, vipUntil: undefined };
      } else {
        const duration = months || 1;
        const until = new Date();
        until.setMonth(until.getMonth() + duration);
        updated = { isVip: true, vipUntil: until.toISOString() };
      }
      await updateUser(id, updated);
      showToast(updated.isVip ? `Status VIP ativado até ${new Date(updated.vipUntil!).toLocaleDateString()}!` : "Status VIP removido.", "success");
    }
  };

  const toggleFriend = async (friendId: string) => {
    if (!currentUser) return;
    const isFriend = currentUser.friendIds?.includes(friendId);
    if (isFriend) {
      const updatedIds = currentUser.friendIds.filter(id => id !== friendId);
      await updateUser(currentUser.id, { friendIds: updatedIds });
      showToast("Amigo removido.", "info");
    } else {
      sendFriendRequest(friendId);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!currentUser) return;
    if (friendRequests.some(r => r.senderId === currentUser.id && r.receiverId === receiverId && r.status === 'pending')) {
      showToast("Pedido já enviado.", "info");
      return;
    }
    const req: FriendRequest = {
      id: `req_${Date.now()}`,
      senderId: currentUser.id,
      receiverId,
      participants: [currentUser.id, receiverId],
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'friendRequests', req.id), req);
      showToast("Pedido de amizade enviado!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'friendRequests');
    }
  };

  const respondToFriendRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), { status });
      
      if (status === 'accepted') {
        const req = friendRequests.find(r => r.id === requestId);
        if (req && currentUser) {
          const otherId = req.senderId === currentUser.id ? req.receiverId : req.senderId;
          
          await updateDoc(doc(db, 'users', currentUser.id), { 
            friendIds: arrayUnion(otherId) 
          });
          await updateDoc(doc(db, 'users', otherId), { 
            friendIds: arrayUnion(currentUser.id) 
          });
        }
        showToast("Pedido aceito!", "success");
      } else {
        showToast("Pedido recusado.", "info");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `friend_requests/${requestId}`);
    }
  };

  const addGame = async (game: Game) => {
    try {
      await setDoc(doc(db, 'games', game.id), sanitize(game));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `games/${game.id}`);
    }
  };

  const updateGame = async (game: Game) => {
    try {
      await setDoc(doc(db, 'games', game.id), sanitize(game));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `games/${game.id}`);
    }
  };

  const deleteGame = async (gameId: string) => {
    try {
      await deleteDoc(doc(db, 'games', gameId));
      showToast("Jogo removido.", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `games/${gameId}`);
      showToast("Erro ao remover jogo.", "error");
    }
  };

  const addAchievement = async (achievement: Achievement) => {
    try {
      await setDoc(doc(db, 'achievements', achievement.id), sanitize(achievement));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `achievements/${achievement.id}`);
    }
  };

  const updateAchievement = async (achievement: Achievement) => {
    try {
      await setDoc(doc(db, 'achievements', achievement.id), sanitize(achievement));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `achievements/${achievement.id}`);
    }
  };

  const deleteAchievement = async (achievementId: string) => {
    try {
      await deleteDoc(doc(db, 'achievements', achievementId));
      showToast("Conquista removida.", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `achievements/${achievementId}`);
      showToast("Erro ao remover conquista.", "error");
    }
  };

  const addFeedback = async (achievementId: string, comment: string) => {
    if (!currentUser) return;
    const newFeedback: Feedback = {
      id: `fb_${Date.now()}`,
      achievementId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      comment,
      timestamp: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'feedbacks', newFeedback.id), newFeedback);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `feedbacks/${newFeedback.id}`);
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    try {
      await deleteDoc(doc(db, 'feedbacks', feedbackId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `feedbacks/${feedbackId}`);
    }
  };

  const addUserGoal = async (description: string) => {
    if (!currentUser) return;
    const newGoal: UserGoal = {
      id: `goal_${Date.now()}`,
      userId: currentUser.id,
      description,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'goals', newGoal.id), newGoal);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `goals/${newGoal.id}`);
    }
  };

  const toggleUserGoal = async (goalId: string) => {
    const goal = userGoals.find(g => g.id === goalId);
    if (!goal) return;
    try {
      await updateDoc(doc(db, 'goals', goalId), { isCompleted: !goal.isCompleted });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `goals/${goalId}`);
    }
  };

  const deleteUserGoal = async (goalId: string) => {
    try {
      await deleteDoc(doc(db, 'goals', goalId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `goals/${goalId}`);
    }
  };

  const addWallpaper = async (wp: ProfileWallpaper) => {
    try {
      await setDoc(doc(db, 'wallpapers', wp.id), wp);
      showToast("Wallpaper adicionado!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `wallpapers/${wp.id}`);
    }
  };

  const deleteWallpaper = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'wallpapers', id));
      showToast("Wallpaper removido.", "info");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `wallpapers/${id}`);
    }
  };

  const updateProgress = async (achievementId: string, status: AchievementStatus, proofUrl?: string, method?: 'manual' | 'visual_steam') => {
    if (!currentUser) return;
    const isAlreadyCompleted = userProgress[achievementId]?.status === AchievementStatus.COMPLETED;
    
    const progressData: UserAchievementProgress = { 
      achievementId, 
      status, 
      proofUrl: proofUrl || undefined,
      validatedMethod: method || undefined,
      validatedAt: new Date().toISOString() 
    };

    try {
      await setDoc(doc(db, `users/${currentUser.id}/progress`, achievementId), progressData);

      // Award XP if just completed
      if (status === AchievementStatus.COMPLETED && !isAlreadyCompleted) {
        const achievement = achievements.find(a => a.id === achievementId);
        if (achievement) {
          const xpToAdd = achievement.xp || 10;
          await updateDoc(doc(db, 'users', currentUser.id), { 
            xp: increment(xpToAdd) 
          });
          showToast(`Você ganhou ${xpToAdd} XP por desbloquear "${achievement.name}"!`, "success");
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.id}/progress/${achievementId}`);
    }
  };

  const toggleLibrary = async (gameId: string) => {
    if (!currentUser) return;
    const updatedIds = currentUser.libraryGameIds.includes(gameId)
      ? currentUser.libraryGameIds.filter(id => id !== gameId)
      : [...currentUser.libraryGameIds, gameId];
    await updateUser(currentUser.id, { libraryGameIds: updatedIds });
  };

  const toggleFavorite = async (gameId: string) => {
    if (!currentUser) return;
    const updatedIds = currentUser.favoriteGameIds.includes(gameId)
      ? currentUser.favoriteGameIds.filter(id => id !== gameId)
      : [...currentUser.favoriteGameIds, gameId];
    await updateUser(currentUser.id, { favoriteGameIds: updatedIds });
  };

  const [confirmModal, setConfirmModal] = useState<{ message: string, onConfirm: () => void } | null>(null);

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm });
  };

  const getSteamAuthUrl = async () => {
    return await api.getSteamAuthUrl();
  };

  const sanitize = (obj: any) => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach(key => {
      if (newObj[key] === undefined) {
        delete newObj[key];
      }
    });
    return newObj;
  };

  const addContent = async (content: Content) => {
    try {
      await setDoc(doc(db, 'contents', content.id), sanitize(content));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `contents/${content.id}`);
    }
  };

  const updateContent = async (content: Content) => {
    try {
      await setDoc(doc(db, 'contents', content.id), sanitize(content));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `contents/${content.id}`);
    }
  };

  const deleteContent = async (contentId: string) => {
    try {
      await deleteDoc(doc(db, 'contents', contentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `contents/${contentId}`);
    }
  };

  const addSubPage = async (subPage: SubPage) => {
    try {
      await setDoc(doc(db, 'subPages', subPage.id), sanitize(subPage));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `subPages/${subPage.id}`);
    }
  };

  const updateSubPage = async (subPage: SubPage) => {
    try {
      await setDoc(doc(db, 'subPages', subPage.id), sanitize(subPage));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `subPages/${subPage.id}`);
    }
  };

  const deleteSubPage = async (subPageId: string) => {
    try {
      // Delete all contents of this sub-page
      const q = query(collection(db, 'contents'), where('subPageId', '==', subPageId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      await deleteDoc(doc(db, 'subPages', subPageId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `subPages/${subPageId}`);
    }
  };

  const syncSteamAchievements = async (steamId: string, gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || !game.steamAppId) {
      throw new Error("Este jogo não possui um Steam AppID configurado.");
    }
    return await api.syncSteamAchievements(steamId, game.steamAppId);
  };

  const importAchievementsFromSteam = async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || !game.steamAppId) {
      showToast("Este jogo não possui um Steam AppID configurado.", "error");
      return;
    }

    try {
      showToast("Importando conquistas da Steam...", "info");
      const schema = await api.getGameSchema(game.steamAppId);
      
      if (!schema || schema.length === 0) {
        showToast("Nenhuma conquista encontrada na Steam para este jogo.", "error");
        return;
      }

      let importedCount = 0;
      let skippedCount = 0;

      for (const steamAch of schema) {
        // Check if achievement already exists (by steamApiName or name)
        const exists = achievements.some(a => 
          a.gameId === gameId && 
          (a.steamApiName === steamAch.name || a.name.toLowerCase() === steamAch.displayName.toLowerCase())
        );

        if (exists) {
          skippedCount++;
          continue;
        }

        const newAchievement: Achievement = {
          id: `ach_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          gameId,
          name: steamAch.displayName,
          description: steamAch.description || 'Sem descrição.',
          icon: steamAch.icon,
          xp: 10, // Default XP
          isHidden: steamAch.hidden === 1,
          difficulty: 'Médio',
          steamApiName: steamAch.name,
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'achievements', newAchievement.id), newAchievement);
        importedCount++;
      }

      if (importedCount > 0) {
        showToast(`${importedCount} conquistas importadas com sucesso! (${skippedCount} já existiam)`, "success");
      } else {
        showToast(`Nenhuma conquista nova para importar. (${skippedCount} já existem)`, "info");
      }
    } catch (err) {
      console.error("Erro ao importar conquistas:", err);
      showToast("Falha ao importar conquistas da Steam.", "error");
    }
  };

  const syncSteamLibrary = async () => {
    if (!currentUser || !currentUser.steamId) {
      showToast("Vincule sua conta Steam primeiro.", "error");
      return;
    }

    try {
      showToast("Buscando sua biblioteca na Steam...", "info");
      const steamGames = await api.getOwnedGames(currentUser.steamId);
      
      if (!steamGames || !Array.isArray(steamGames)) {
        showToast("Não foi possível recuperar seus jogos da Steam.", "error");
        return;
      }

      console.log(`Steam retornou ${steamGames.length} jogos.`);
      const steamAppIds = steamGames.map((sg: any) => sg.appid.toString());
      
      // Encontrar jogos no nosso catálogo que o usuário possui na Steam
      const matchedGames = games.filter(g => {
        if (!g.steamAppId) return false;
        // Garantir que ambos sejam strings para comparação
        const catalogAppId = g.steamAppId.toString();
        return steamAppIds.includes(catalogAppId);
      });

      console.log(`Encontrados ${matchedGames.length} jogos correspondentes no catálogo.`);
      
      if (matchedGames.length === 0) {
        showToast("Nenhum jogo do catálogo encontrado na sua biblioteca Steam.", "info");
        return;
      }

      const matchedGameIds = matchedGames.map(g => g.id);
      const currentLibrary = currentUser.libraryGameIds || [];
      
      // Identificar quais são realmente novos
      const newGamesToAdd = matchedGameIds.filter(id => !currentLibrary.includes(id));
      
      if (newGamesToAdd.length === 0) {
        showToast("Sua biblioteca já está sincronizada com os jogos do catálogo.", "info");
        return;
      }

      const newLibrary = Array.from(new Set([...currentLibrary, ...matchedGameIds]));
      
      await updateUser(currentUser.id, { libraryGameIds: newLibrary });
      
      if (newGamesToAdd.length === 1) {
        const gameName = matchedGames.find(g => g.id === newGamesToAdd[0])?.title || "1 jogo";
        showToast(`"${gameName}" foi adicionado à sua biblioteca!`, "success");
      } else {
        showToast(`${newGamesToAdd.length} novos jogos foram adicionados à sua biblioteca!`, "success");
      }
    } catch (err: any) {
      console.error("Error syncing steam library:", err);
      showToast(err.message || "Erro ao sincronizar biblioteca Steam.", "error");
    }
  };

  const submitForAnalysis = async (gameId: string, achievementId: string, proofUrl: string, confidence: string) => {
    if (!currentUser) return;
    const id = `val_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const achievement = achievements.find(a => a.id === achievementId);
    
    const newValidation: PendingValidation = {
      id,
      userId: currentUser.id,
      userName: currentUser.name,
      gameId,
      achievementId,
      achievementName: achievement?.name || 'Conquista Desconhecida',
      proofUrl,
      timestamp: new Date().toISOString(),
      confidence
    };

    try {
      await setDoc(doc(db, 'pendingValidations', id), newValidation);
      
      // Also update progress to IN_ANALYSIS
      await updateProgress(achievementId, AchievementStatus.IN_ANALYSIS, proofUrl);
      
      showToast("Sua conquista foi enviada para análise!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `pendingValidations/${id}`);
    }
  };

  const approveValidation = async (validationId: string) => {
    const validation = pendingValidations.find(v => v.id === validationId);
    if (!validation) return;

    try {
      await updateProgress(validation.achievementId, AchievementStatus.COMPLETED, validation.proofUrl);
      
      // Log validation
      const logId = `log_${Date.now()}`;
      await setDoc(doc(db, 'validationLogs', logId), {
        id: logId,
        userId: validation.userId,
        gameId: validation.gameId,
        achievementId: validation.achievementId,
        achievementName: validation.achievementName,
        status: 'APPROVED',
        timestamp: new Date().toISOString()
      });

      await deleteDoc(doc(db, 'pendingValidations', validationId));
      showToast("Conquista aprovada com sucesso!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `validationLogs`);
    }
  };

  const rejectValidation = async (validationId: string, adminNote?: string) => {
    const validation = pendingValidations.find(v => v.id === validationId);
    if (!validation) return;

    try {
      await updateProgress(validation.achievementId, AchievementStatus.LOCKED);
      
      // Log validation
      const logId = `log_${Date.now()}`;
      await setDoc(doc(db, 'validationLogs', logId), {
        id: logId,
        userId: validation.userId,
        gameId: validation.gameId,
        achievementId: validation.achievementId,
        achievementName: validation.achievementName,
        status: 'REJECTED',
        timestamp: new Date().toISOString(),
        adminNote
      });

      await deleteDoc(doc(db, 'pendingValidations', validationId));
      showToast("Conquista rejeitada.", "info");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `validationLogs`);
    }
  };

  const handleConfirm = () => {
    if (confirmModal) {
      confirmModal.onConfirm();
      setConfirmModal(null);
    }
  };

  return (
    <AppContext.Provider value={{ 
      games, achievements, contents, subPages, users, wallpapers, storeItems, events, currentUser, userProgress, feedbacks, pendingValidations, validationLogs, userGoals, rewardSettings, systemSettings,
      messages, unreadCounts, friendRequests,
      communityGroups, communityPosts, myCommunityMemberships, generalNotifications, myReadNotifications,
      isAuthReady,
      deviceType, isTouch, viewport, isMobile, isTablet, isDesktop,
      levels, addLevel, updateLevel, deleteLevel,
      onlineUsers,
      login, loginWithOAuth, register, logout, updateUser, addBalance, adminAddBalance, updateRewardSettings, updateSystemSettings, updateProgress, syncSteamAchievements, importAchievementsFromSteam, syncSteamLibrary, getSteamAuthUrl, addUserGoal, toggleUserGoal, deleteUserGoal, addFeedback, deleteFeedback, showToast,
      sendMessage, markMessagesAsRead,
      createCommunityGroup, joinCommunityGroup, leaveCommunityGroup, banUserFromGroup, unbanUserFromGroup, deleteCommunityGroup, createCommunityPost, getCommunityMembers,
      createGeneralNotification, markNotificationAsRead,
      forgotPassword, resetPassword, completeRegistration,
      pendingUser,
      approveValidation, rejectValidation, submitForAnalysis,
      addGame, updateGame, deleteGame, addAchievement, updateAchievement, deleteAchievement, addContent, updateContent, deleteContent,
      addSubPage, updateSubPage, deleteSubPage,
      addWallpaper, deleteWallpaper, addStoreItem, updateStoreItem, deleteStoreItem, addEvent, updateEvent, deleteEvent,
      toggleBanUser, toggleAdminUser, toggleVipUser, toggleFriend, sendFriendRequest, respondToFriendRequest, toggleLibrary, toggleFavorite, validateWithImage: async () => [],
      showConfirm
    }}>
      {isLoading ? (
        <div className="h-screen w-screen bg-steam-dark flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-steam-highlight border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-steam-highlight font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando Banco de Dados...</p>
        </div>
      ) : (
        <>
          {children}
          {confirmModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-[#1b2838] p-8 rounded-3xl border border-transparent shadow-5xl max-w-sm w-full text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 italic">Confirmar Exclusão?</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">{confirmModal.message}</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmModal(null)} className="flex-1 py-4 bg-white/5 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all">Cancelar</button>
                  <button onClick={handleConfirm} className="flex-1 py-4 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-500 transition-all shadow-xl shadow-red-600/20">Confirmar</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

export const useDevice = () => {
  const { deviceType, isTouch, viewport, isMobile, isTablet, isDesktop } = useApp();
  return { deviceType, isTouch, viewport, isMobile, isTablet, isDesktop };
};
