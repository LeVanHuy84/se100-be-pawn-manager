# Sơ đồ Kiến trúc Hệ thống (Architecture Diagram)

Tài liệu này mô tả kiến trúc phần mềm của hệ thống Pawn Manager. Hệ thống được xây dựng theo mô hình **Modular Monolith** trên nền tảng **NestJS**, giúp đảm bảo tính tổ chức code rõ ràng, dễ bảo trì nhưng vẫn giữ được sự đơn giản của một khối thống nhất (Monolith) trong việc triển khai.

## Mô tả Kiến trúc (Tiếng Việt)

Hệ thống được chia thành các tầng (layers) chính sau:

1.  **Presentation Layer (Tầng Giao diện/API)**:
    -   Là điểm tiếp nhận các yêu cầu HTTP từ Client.
    -   Sử dụng **Controllers** để định nghĩa các endpoints.
    -   Áp dụng các **Guards** (như `ClerkAuthGuard`) để xác thực và phân quyền.
    -   Sử dụng **Pipes** (như `ZodValidationPipe`) để kiểm tra dữ liệu đầu vào.
    -   Sử dụng **Interceptors** và **Filters** để xử lý logging và lỗi tập trung.

2.  **Application Layer (Tầng Ứng dụng/Modules)**:
    -   Chứa logic nghiệp vụ cốt lõi, được chia thành các Modules chức năng riêng biệt.
    -   **Core Business**: Quản lý khoản vay (`Loan`), Cầm cố (`Collateral`), Thanh toán (`Payment`), Giải ngân (`Disbursement`), Lịch trả nợ (`RepaymentSchedule`).
    -   **Management**: Quản lý Cửa hàng (`Store`), Nhân viên (`Employee`), Khách hàng (`Customer`).
    -   **Support**: Định giá AI (`Valuation`), Cấu hình (`Configurations`), Báo cáo (`Reports`).

3.  **Infrastructure Layer (Tầng Hạ tầng)**:
    -   Cung cấp các dịch vụ nền tảng cho ứng dụng.
    -   **Database Access**: Sử dụng **Prisma ORM** để tương tác với PostgreSQL.
    -   **Job Queue**: Sử dụng **BullMQ** và **Redis** để xử lý các tác vụ nền (gửi email, SMS, tính toán phức tạp).
    -   **Communication**: Module giao tiếp với Twilio (SMS) và SMTP (Email).

4.  **External Services (Dịch vụ Ngoài)**:
    -   Tích hợp với các bên thứ 3 như Clerk (Auth), Cloudinary (Media), Google Gemini (AI).

## Architecture Diagram (English)

```plantuml
@startuml
title Architecture Diagram - Pawn Manager System
skinparam componentStyle uml2

package "Client Layer" {
    [Web Application] as Web
    [Mobile Application] as Mobile
}

package "API Layer (NestJS)" {
    component "API Gateway / Guards" as Gateway
    
    package "Core Business Modules" {
        component "Loan Module" as Loan
        component "Payment Module" as Payment
        component "Disbursement Module" as Disb
        component "Collateral Module" as Collat
        component "Repayment Module" as Repay
    }
    
    package "Management Modules" {
        component "Customer Module" as Cust
        component "Employee Module" as Emp
        component "Store Module" as Store
    }
    
    package "Support Modules" {
        component "Valuation Module (AI)" as Valuation
        component "Communication Module" as Comm
        component "Audit Log Module" as Audit
        component "Report Module" as Report
    }
}

package "Infrastructure Layer" {
    component "Prisma Service (ORM)" as Prisma
    component "BullMQ Service (Queue)" as Bull
}

database "PostgreSQL" as DB
database "Redis" as Cache

cloud "External Services" {
    [Clerk (Auth)] as ExtAuth
    [Cloudinary (Media)] as ExtMedia
    [Google Gemini (AI)] as ExtAI
    [Twilio / SMTP] as ExtMsg
}

' Relationships
Web --> Gateway : HTTP/REST
Mobile --> Gateway : HTTP/REST

Gateway --> Loan
Gateway --> Payment
Gateway --> Cust
Gateway --> Emp

' Cross-module dependencies
Loan ..> Collat : depends on
Loan ..> Cust : depends on
Loan ..> Disb : triggers
Loan ..> Repay : generates
Payment ..> Repay : updates
Payment ..> Comm : notifies
Payment ..> Audit : logs

' Support usage
Loan --> Valuation : uses
Valuation --> ExtAI : analyze

' Infrastructure usage
Loan --> Prisma
Payment --> Prisma
Cust --> Prisma
Comm --> Bull

Bull --> Redis : manage queue
Bull --> ExtMsg : send async

Prisma --> DB : SQL

' Authentication
Gateway ..> ExtAuth : verify token

@enduml
```
