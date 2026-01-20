# SE100 Pawn Manager - Backend

Đây là repository chứa mã nguồn backend cho hệ thống quản lý tiệm cầm đồ (Pawn Manager). Dự án này được xây dựng bằng **NestJS** và sử dụng **PostgreSQL** làm cơ sở dữ liệu.

> **Lưu ý:** Đây chỉ là phần Backend. Phần Frontend của ứng dụng nằm ở một repository riêng biệt.

## Yêu cầu hệ thống

Để chạy được dự án này, máy tính của bạn cần cài đặt sẵn:

- **Node.js** (phiên bản 18 trở lên)
- **npm** (trình quản lý gói của Node.js)
- **Docker & Docker Compose** (để chạy database PostgreSQL và Redis)

## Hướng dẫn cài đặt và chạy (Dành cho Windows)

Để có thể clone và chạy dự án một cách nhanh nhất, vui lòng làm theo các bước sau:

### 1. Clone repository và cài đặt dependencies

Mở terminal (PowerShell hoặc Command Prompt) và chạy các lệnh sau:

```powershell
# Clone dự án
git clone https://github.com/LeVanHuy84/se100-be-pawn-manager.git

# Di chuyển vào thư mục dự án
cd se100-be-pawn-manager

# Cài đặt các thư viện cần thiết
npm install
```

### 2. Cấu hình biến môi trường

Copy file cấu hình mẫu `.env.example` thành `.env`:

```powershell
copy .env.example .env
```

Sau đó, mở file `.env` và cập nhật các thông tin cấu hình nếu cần thiết (ví dụ: thông tin kết nối Database, API Key, v.v.).

> **Quan trọng:** Đảm bảo `DATABASE_URL` và `REDIS_URL` trong file `.env` khớp với cấu hình trong `docker-compose.yml` (hoặc sử dụng giá trị mặc định đã có sẵn trong `.env.example` nếu bạn chạy Docker Compose mặc định).

### 3. Khởi chạy Database và Redis

Sử dụng Docker Compose để tạo và chạy các container cho database và redis:

```powershell
docker-compose up -d
```

Chờ một lát để các container khởi động hoàn toàn.

### 4. Chạy ứng dụng

Dự án đã được tích hợp sẵn một script tự động để đồng bộ database, nạp dữ liệu mẫu (seed) và khởi chạy server. Bạn chỉ cần chạy lệnh sau:

```powershell
npm run dev:local
```

Lệnh này sẽ tự động thực hiện các bước:

1.  **Sync Schema:** Cập nhật cấu trúc database (`prisma db push`).
2.  **Seed Data:** Nạp dữ liệu mẫu vào database (`prisma db seed`).
3.  **Start Server:** Khởi chạy backend NestJS.

Sau khi server chạy thành công, bạn có thể truy cập API tại địa chỉ: `http://localhost:3000` (hoặc port bạn cấu hình).

---

## 5. Thông tin liên hệ (Contact Info)

Nếu gặp vấn đề trong quá trình cài đặt hoặc chấm bài, xin vui lòng liên hệ với nhóm:

| Họ và Tên       | MSSV     | Email                  |
| --------------- | -------- | ---------------------- |
| Lê Văn Huy      | 23520616 | 23520616@gm.uit.edu.vn |
| Nguyễn Đình Huy | 23520626 | 23520626@gm.uit.edu.vn |

_(Thầy/cô vui lòng liên hệ qua Email nếu cần hỗ trợ gấp)_

---

## Các lệnh khác (Tham khảo)

Nếu muốn chạy thủ công từng bước hoặc trên môi trường không phải Windows, bạn có thể dùng các lệnh sau:

- **Chạy server (môi trường dev):** `npm run start:dev`
- **Đồng bộ Database:** `npx prisma db push`
- **Nạp dữ liệu mẫu:** `npm run seed`
- **Tạo Prisma Client:** `npx prisma generate`

## Tài liệu API

Dự án có sử dụng Swagger để document API. Sau khi server chạy, bạn có thể xem tài liệu chi tiết tại đường dẫn:
`http://localhost:3000/api` (hoặc `/docs` tùy vào cấu hình cụ thể, thường mặc định NestJS setup là `/api`).
