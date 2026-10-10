/**
 * Chuyển mã lỗi Firebase Auth sang thông báo tiếng Việt
 */
export function getAuthErrorMessage(code) {
  const messages = {
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/user-disabled': 'Tài khoản đã bị vô hiệu hóa.',
    'auth/user-not-found': 'Không tìm thấy tài khoản với email này.',
    'auth/wrong-password': 'Sai mật khẩu.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/email-already-in-use': 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.',
    'auth/weak-password': 'Mật khẩu quá yếu. Cần ít nhất 6 ký tự.',
    'auth/operation-not-allowed': 'Phương thức đăng nhập chưa được bật. Liên hệ quản trị viên.',
    'auth/too-many-requests': 'Quá nhiều lần thử. Vui lòng thử lại sau.',
    'auth/network-request-failed': 'Lỗi mạng. Kiểm tra kết nối và thử lại.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.',
    'auth/cancelled-popup-request': 'Vui lòng thử đăng nhập Google lại.',
    'auth/account-exists-with-different-credential': 'Email này đã được dùng với phương thức đăng nhập khác. Thử đăng nhập bằng email/mật khẩu.',
  }
  return messages[code] || 'Đã xảy ra lỗi. Vui lòng thử lại.'
}
