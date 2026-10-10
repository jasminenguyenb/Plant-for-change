import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../firebase'

/**
 * Đăng nhập bằng Google, sau đó đảm bảo có document users/{uid} trong Firestore
 * (giống luồng đăng ký email: tạo mới hoặc cập nhật thông tin).
 */
export async function signInWithGoogleAndEnsureUser() {
  const provider = new GoogleAuthProvider()
  const { user } = await signInWithPopup(auth, provider)

  const userRef = doc(db, 'users', user.uid)
  const snap = await getDoc(userRef)

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email || null,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else {
    await updateDoc(userRef, {
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      updatedAt: serverTimestamp(),
    })
  }

  return user
}
