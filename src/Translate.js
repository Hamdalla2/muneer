export const languages={english:"English",arabic:"العربية"};
const ar={"Muneer Store":"متجر منير","Menu":"القائمة","Sign in":"تسجيل الدخول","Products":"المنتجات","My Orders":"طلباتي","My Profile":"ملفي الشخصي","Change Password":"تغيير كلمة المرور","Sign Out":"تسجيل الخروج","Hello":"مرحباً","Language":"اللغة","Account":"الحساب"};
export const translate=(text,language)=>language==="arabic"?(ar[text]||text):text;
