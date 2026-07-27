import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
// Request Google Workspace Scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('google_access_token');

// Initialize Auth Listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If we don't have cachedAccessToken yet, user can click "Sign in with Google" to refresh token
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('google_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่สามารถดึง Access Token จาก Google Sign-in');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('google_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in Error:', error);
    let userFriendlyMessage = error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
    if (error.code === 'auth/popup-blocked') {
      userFriendlyMessage = 'เบราว์เซอร์ของคุณบล็อกหน้าต่างป๊อปอัพ (Popup Blocked) กรุณาคลิก "อนุญาตป๊อปอัพ" ในช่องที่อยู่ของเบราว์เซอร์ (Address Bar) หรือหากใช้งานผ่านหน้าแก้ไขของ AI Studio แนะนำให้คลิกเปิดแอปพลิเคชันในแท็บใหม่ (Open in new tab) เพื่อเข้าสู่ระบบด้วย Google ได้สำเร็จ';
    } else if (error.code === 'auth/cancelled-popup-request') {
      userFriendlyMessage = 'การเข้าสู่ระบบถูกยกเลิก หรือมีการขอหน้าต่างเข้าสู่ระบบซ้ำซ้อน กรุณารอสักครู่แล้วลองใหม่อีกครั้ง หรือแนะนำให้เปิดแอปพลิเคชันในแท็บใหม่ (Open in new tab) เพื่อลดข้อจำกัดของเบราว์เซอร์';
    } else if (error.code === 'auth/popup-closed-by-user') {
      userFriendlyMessage = 'หน้าต่างเข้าสู่ระบบถูกปิดโดยผู้ใช้ กรุณากดปุ่มเข้าสู่ระบบอีกครั้งเพื่อเข้าสู่ระบบใหม่';
    } else if (error.code === 'auth/network-request-failed') {
      userFriendlyMessage = 'การเชื่อมต่อเครือข่ายล้มเหลว กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ';
    }
    const enhancedError = new Error(userFriendlyMessage);
    (enhancedError as any).code = error.code;
    throw enhancedError;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken || localStorage.getItem('google_access_token');
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('google_access_token');
};
