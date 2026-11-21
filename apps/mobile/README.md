# EduK12 Open Mobile App (Android & iOS — React Native / Expo)

Ứng dụng di động chính thức cho học sinh & cộng đồng, kết nối trực tiếp vào hệ thống Cloud `https://eduk12-scale.eduk12-scale.workers.dev`.

## Tính năng có sẵn
- Đăng nhập học sinh & xác thực bảo mật 2 lớp (2FA Google Authenticator).
- Học bài giảng Lớp 1–12 theo từng khối lớp & môn học.
- Tham gia Lớp học / Lớp Lập trình bằng Mã lớp (`CODE-JS01`, `TOAN12-A1`).
- Thi trắc nghiệm trực tuyến có đồng hồ đếm ngược, tự động lưu nháp offline bằng `AsyncStorage`, chấm điểm tức thì.

## 1. Chạy thử ngay trên iPhone / Android thật (Expo Go)
```bash
cd apps/mobile
npm install
npx expo start
```
Mở ứng dụng **Expo Go** trên iPhone hoặc Android và quét mã QR trên màn hình terminal.

## 2. Xuất file `.apk` cài trực tiếp cho Android & Đưa lên Google Play / App Store
```bash
npm install -g eas-cli
eas login

# Xuất file .APK cài trực tiếp Android (miễn phí trên Expo Cloud)
npx eas build -p android --profile preview

# Đóng gói bản Store (.AAB cho Google Play & .IPA cho Apple App Store)
npx eas build -p all --profile production
```
