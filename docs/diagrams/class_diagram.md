# Biểu đồ Lớp (Class Diagram) - Pawn Manager System

Tài liệu này mô tả chi tiết cấu trúc các lớp (Classes) và mối quan hệ giữa chúng trong hệ thống quản lý cầm đồ.

## Tổng quan (Overview)

Biểu đồ dưới đây cung cấp cái nhìn toàn cảnh về toàn bộ hệ thống.

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam linetype ortho
hide methods

package "Core Domain" {
    class Loan {
        +id: UUID
        +loanCode: String
        +loanAmount: Decimal
        +status: LoanStatus
    }

    class Customer {
        +id: UUID
        +fullName: String
        +nationalId: String
    }

    class Collateral {
        +id: UUID
        +ownerName: String
        +status: CollateralStatus
    }

    class CollateralType {
        +id: Integer
        +name: String
    }

    class LoanType {
        +id: Integer
        +name: String
    }

    class Store {
        +id: UUID
        +name: String
    }
}

package "Financial & Operations" {
    class RepaymentScheduleDetail {
        +id: UUID
        +periodNumber: Integer
        +dueDate: DateTime
        +totalAmount: Decimal
        +status: RepaymentItemStatus
    }

    class LoanPayment {
        +id: UUID
        +amount: Decimal
        +paymentType: PaymentType
        +paidAt: DateTime
    }

    class PaymentAllocation {
        +id: UUID
        +amount: Decimal
        +componentType: PaymentComponent
    }

    class Disbursement {
        +id: UUID
        +amount: Decimal
        +disbursedAt: DateTime
    }

    class RevenueLedger {
        +id: UUID
        +type: RevenueType
        +amount: Decimal
    }
}

package "External / System" {
    class Employee <<Clerk User>> {
        +id: String
        +email: String
    }

    class Location {
        +id: String
        +name: String
        +level: LocationLevel
    }

    class AuditLog {
        +id: UUID
        +action: String
    }

    class NotificationLog {
        +id: UUID
        +type: NotificationType
    }
}

' --- RELATIONSHIPS ---
Loan "1" -- "0..*" RepaymentScheduleDetail
Loan "1" -- "0..*" LoanPayment
Loan "1" -- "0..*" Collateral
Loan "1" -- "0..1" LoanType
Loan "1" -- "1" Customer
Loan "1" -- "1" Store
Loan "1" -- "0..*" Disbursement
Loan "1" -- "0..*" NotificationLog

LoanPayment "1" -- "1..*" PaymentAllocation
Store "1" -- "0..*" RevenueLedger
Store "1" -- "0..*" LoanPayment

Collateral "0..*" -- "1" CollateralType
Collateral "0..*" -- "0..1" Store

Customer "0..*" -- "1" Location
Store "0..*" -- "1" Location

Employee "1" .. "0..*" Loan
Employee "1" .. "0..*" LoanPayment

@enduml
```

## Chi tiết theo tên miền (Domain Details)

### 1. Core Domain (Nghiệp vụ lõi)

Bao gồm các thực thể chính để vận hành quy trình vay cầm cố: Khoản vay, Khách hàng, Tài sản và Cửa hàng.

```plantuml
@startuml
hide methods
package "Core Domain" {
    class Loan
    class Customer
    class Collateral
    class CollateralType
    class LoanType
    class Store
}

Loan "1" -up- "1" Customer : belongs to >
Loan "1" -right- "1" Store : managed at >
Loan "1" -down- "0..*" Collateral : secured by >
Loan "1" -left- "0..1" LoanType : defined by >
Collateral "0..*" -- "1" CollateralType : classified as >
Collateral "0..*" -- "0..1" Store : stored at >
@enduml
```

| Thực thể nguồn (Source) | Quan hệ (Relationship) | Thực thể đích (Target) | Mô tả (Description) |
| :--- | :--- | :--- | :--- |
| **Loan** | 1 -- 1 | **Customer** | Mỗi khoản vay thuộc về duy nhất một khách hàng. |
| **Loan** | 1 -- 1 | **Store** | Khoản vay được quản lý tại một cửa hàng cụ thể. |
| **Loan** | 1 -- 0..* | **Collateral** | Một khoản vay được bảo đảm bởi một hoặc nhiều tài sản cầm cố. |
| **Loan** | 1 -- 0..1 | **LoanType** | Khoản vay tuân theo cấu hình lãi suất và kỳ hạn của một gói vay (Loan Type). |
| **Collateral** | 0..* -- 1 | **CollateralType** | Tài sản thuộc một loại cụ thể (ví dụ: Xe máy, Laptop) để tính phí giữ hộ. |
| **Collateral** | 0..* -- 0..1 | **Store** | Tài sản có thể được lưu kho tại cửa hàng (nếu đang cầm hoặc chờ thanh lý). |

### 2. Financial & Operations (Tài chính & Vận hành)

Quản lý dòng tiền, lịch trả nợ và ghi nhận doanh thu.

```plantuml
@startuml
hide methods
package "Financial" {
    class Loan
    class RepaymentScheduleDetail
    class LoanPayment
    class PaymentAllocation
    class Disbursement
    class RevenueLedger
    class Store
}

Loan "1" -- "0..*" RepaymentScheduleDetail : has >
Loan "1" -- "0..*" LoanPayment : receives >
Loan "1" -- "0..*" Disbursement : has >
LoanPayment "1" -- "1..*" PaymentAllocation : splits into >
Store "1" -- "0..*" LoanPayment : collects >
Store "1" -- "0..*" RevenueLedger : records >
@enduml
```

| Thực thể nguồn (Source) | Quan hệ (Relationship) | Thực thể đích (Target) | Mô tả (Description) |
| :--- | :--- | :--- | :--- |
| **Loan** | 1 -- 0..* | **RepaymentScheduleDetail** | Một khoản vay có nhiều kỳ trả nợ theo lịch (Lịch trả nợ). |
| **Loan** | 1 -- 0..* | **LoanPayment** | Một khoản vay có thể nhận nhiều lần thanh toán từ khách hàng. |
| **Loan** | 1 -- 0..* | **Disbursement** | Khoản vay có thể được giải ngân một hoặc nhiều lần (thường là 1 lần). |
| **LoanPayment** | 1 -- 1..* | **PaymentAllocation** | Số tiền một lần thanh toán được phân bổ chi tiết vào Gốc, Lãi, Phí, hoặc Phạt. |
| **Store** | 1 -- 0..* | **LoanPayment** | Cửa hàng là nơi thu tiền thanh toán của khách. |
| **Store** | 1 -- 0..* | **RevenueLedger** | Mọi khoản thu (Lãi, Phí) hoặc thanh lý tài sản đều được ghi nhận vào sổ cái doanh thu của cửa hàng. |

### 3. System & External (Hệ thống & Bên ngoài)

Các thực thể hỗ trợ quản lý người dùng, địa điểm và giám sát hệ thống.

```plantuml
@startuml
hide methods
package "System & External" {
    class Employee <<Clerk User>>
    class Location
    class AuditLog
    class NotificationLog
    class Customer
    class Store
    class Loan
}

Customer "0..*" -- "1" Location : resides in >
Store "0..*" -- "1" Location : located in >
Loan "1" -- "0..*" NotificationLog : triggers >
Employee "1" .. "0..*" Loan : manages >
@enduml
```

| Thực thể nguồn (Source) | Quan hệ (Relationship) | Thực thể đích (Target) | Mô tả (Description) |
| :--- | :--- | :--- | :--- |
| **Customer** | 0..* -- 1 | **Location** | Khách hàng cư trú tại một Phường/Xã (Location) cụ thể. |
| **Store** | 0..* -- 1 | **Location** | Cửa hàng đặt tại một địa bàn Phường/Xã cụ thể. |
| **Loan** | 1 -- 0..* | **NotificationLog** | Các sự kiện của khoản vay (đến hạn, quá hạn) kích hoạt việc tạo nhật ký thông báo. |
| **Employee** | 1 .. 0..* | **Loan** | Nhân viên thực hiện các hành động trên khoản vay (Duyệt, Tạo, Từ chối) - Quan hệ logic qua ID. |
| **AuditLog** | N/A | **Entities** | Lưu vết thay đổi của các thực thể (Loan, Customer, v.v.) nhưng không có khóa ngoại cứng (Loose Coupling). |