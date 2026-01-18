# Database Schema (ERD)

This document contains the Entity Relationship Diagram (ERD) and detailed specifications for each entity.

## Overview ERD

The following diagram illustrates the relationships between all entities in the system.

```plantuml
@startuml
skinparam linetype ortho
skinparam nodesep 60
skinparam ranksep 60
hide methods

' ==================================================
' ENTITIES
' ==================================================

entity "LoanType" {
  *id : Int <<PK>>
  --
  name : String
  description : String?
  durationMonths : Int
  interestRateMonthly : Decimal
  createdAt : DateTime
  updatedAt : DateTime
}

entity "Customer" {
  *id : String <<PK>>
  --
  fullName : String
  dob : DateTime
  nationalId : String
  phone : String?
  email : String?
  address : String?
  customerType : CustomerType
  monthlyIncome : Decimal?
  creditScore : Int?
  images : Json
  wardId : String
  createdAt : DateTime
  updatedAt : DateTime
}

entity "Loan" {
  *id : String <<PK>>
  --
  loanCode : String
  customerId : String <<FK>>
  loanAmount : Decimal
  repaymentMethod : RepaymentMethod
  loanTypeId : Int <<FK>>
  durationMonths : Int
  appliedInterestRate : Decimal
  latePaymentPenaltyRate : Decimal
  totalInterest : Decimal
  totalFees : Decimal
  totalRepayment : Decimal
  monthlyPayment : Decimal
  startDate : DateTime?
  status : LoanStatus
  approvedAt : DateTime?
  approvedBy : String?
  rejectedAt : DateTime?
  rejectedBy : String?
  activatedAt : DateTime?
  remainingAmount : Decimal
  disbursedAt : DateTime?
  disbursedBy : String?
  disbursementMethod : DisbursementMethod?
  disbursementNote : String?
  notes : String?
  storeId : String <<FK>>
  createdAt : DateTime
  updatedAt : DateTime
  createdBy : String?
}

entity "RepaymentScheduleDetail" {
  *id : String <<PK>>
  --
  loanId : String <<FK>>
  periodNumber : Int
  dueDate : DateTime
  beginningBalance : Decimal
  principalAmount : Decimal
  interestAmount : Decimal
  feeAmount : Decimal
  penaltyAmount : Decimal
  totalAmount : Decimal
  status : RepaymentItemStatus
  paidPrincipal : Decimal?
  paidInterest : Decimal?
  paidFee : Decimal?
  paidPenalty : Decimal?
  paidAt : DateTime?
  lastPenaltyAppliedAt : DateTime?
}

entity "LoanPayment" {
  *id : String <<PK>>
  --
  idempotencyKey : String?
  loanId : String <<FK>>
  storeId : String <<FK>>
  amount : Decimal
  paymentType : PaymentType
  paymentMethod : PaymentMethod
  paidAt : DateTime
  referenceCode : String?
  recorderEmployeeId : String?
  createdAt : DateTime
  updatedAt : DateTime
}

entity "PaymentAllocation" {
  *id : String <<PK>>
  --
  paymentId : String <<FK>>
  componentType : PaymentComponent
  amount : Decimal
  note : String?
}

entity "Disbursement" {
  *id : String <<PK>>
  --
  idempotencyKey : String?
  loanId : String <<FK>>
  storeId : String <<FK>>
  amount : Decimal
  disbursementMethod : DisbursementMethod
  disbursedAt : DateTime
  referenceCode : String?
  disbursedBy : String?
  recipientName : String
  recipientIdNumber : String?
  witnessName : String?
  notes : String?
  bankTransferRef : String?
  bankAccountNumber : String?
  bankName : String?
  createdAt : DateTime
  updatedAt : DateTime
}

entity "CollateralType" {
  *id : Int <<PK>>
  --
  name : String
  custodyFeeRateMonthly : Decimal
}

entity "Store" {
  *id : String <<PK>>
  --
  name : String
  address : String?
  storeInfo : Json
  isActive : Boolean
  wardId : String <<FK>>
  createdAt : DateTime
  updatedAt : DateTime
}

entity "Collateral" {
  *id : String <<PK>>
  --
  collateralTypeId : Int <<FK>>
  ownerName : String
  collateralInfo : Json
  status : CollateralStatus
  loanId : String? <<FK>>
  storageLocation : String?
  receivedDate : DateTime?
  appraisedValue : Decimal?
  ltvRatio : Decimal?
  appraisalDate : DateTime?
  appraisalNotes : String?
  images : Json
  sellPrice : Decimal?
  sellDate : DateTime?
  storeId : String? <<FK>>
  createdAt : DateTime
  updatedAt : DateTime
}

entity "SystemParameter" {
  *id : Int <<PK>>
  --
  paramGroup : String?
  paramKey : String
  paramValue : String
  dataType : String?
  description : String?
  isActive : Boolean
  createdAt : DateTime
  updatedAt : DateTime
}

entity "AuditLog" {
  *id : String <<PK>>
  --
  action : String
  entityId : String
  entityType : AuditEntityType
  entityName : String?
  actorId : String?
  actorName : String?
  oldValue : Json?
  newValue : Json?
  description : String?
  createdAt : DateTime
}

entity "RevenueLedger" {
  *id : String <<PK>>
  --
  type : RevenueType
  amount : Decimal
  refId : String
  storeId : String <<FK>>
  recordedAt : DateTime
}

entity "NotificationLog" {
  *id : String <<PK>>
  --
  type : NotificationType
  channel : NotificationChannel
  status : NotificationStatus
  loanId : String <<FK>>
  customerId : String <<FK>>
  subject : String?
  message : String?
  recipientContact : String?
  callDuration : Int?
  employeeId : String?
  notes : String?
  promiseToPayDate : DateTime?
  sentAt : DateTime?
  createdAt : DateTime
  updatedAt : DateTime
}

entity "Location" {
  *id : String <<PK>>
  --
  code : String
  name : String
  level : LocationLevel
  parentId : String? <<FK>>
}

' ==================================================
' RELATIONSHIPS
' ==================================================

Location "1" -- "*" Customer : "CustomerWard"
Location "1" -- "*" Location : "Parent-Child"
Location "1" -- "*" Store : "StoreWard"

LoanType "1" -- "*" Loan : "Defines"
Customer "1" -- "*" Loan : "Borrows"
Store "1" -- "*" Loan : "Manages"
Loan "1" -- "*" RepaymentScheduleDetail : "Has Schedule"
Loan "1" -- "*" LoanPayment : "Has Payments"
Loan "1" -- "*" Disbursement : "Has Disbursements"
Loan "1" -- "*" Collateral : "Secured By"
Loan "1" -- "*" NotificationLog : "Notifications"

LoanPayment "1" -- "*" PaymentAllocation : "Allocates"
Store "1" -- "*" LoanPayment : "Collects"

Store "1" -- "*" Disbursement : "Pays Out"

CollateralType "1" -- "*" Collateral : "Categorizes"
Store "1" -- "*" Collateral : "Stores"

Store "1" -- "*" RevenueLedger : "Records"

Customer "1" -- "*" NotificationLog : "Receives"

@enduml
```

## Entity Specifications

Detailed descriptions for each entity.

### 1. Loan Product Type

```plantuml
@startuml
entity "LoanType" as LoanType {
  *id : Int <<PK>>
  --
  name : String
  description : String?
  durationMonths : Int
  interestRateMonthly : Decimal
  createdAt : DateTime
  updatedAt : DateTime
}
@enduml
```

| Field | Type | Description |
| :--- | :--- | :--- |
| id | Int | ID (Khóa chính tự tăng) |
| name | String | Tên gói vay (Duy nhất) |
| description | String? | Mô tả chi tiết gói vay |
| durationMonths | Int | Thời hạn vay mặc định (tháng) |
| interestRateMonthly | Decimal | Lãi suất hàng tháng (%) |
| createdAt | DateTime | Ngày tạo |
| updatedAt | DateTime | Ngày cập nhật gần nhất |

### 2. Customer

```plantuml
@startuml
entity "Customer" as Customer {
  *id : String <<PK>>
  --
  fullName : String
  dob : DateTime
  nationalId : String
  phone : String?
  email : String?
  address : String?
  customerType : CustomerType
  monthlyIncome : Decimal?
  creditScore : Int?
  images : Json
  wardId : String
  createdAt : DateTime
  updatedAt : DateTime
}
@enduml
```

| Field | Type | Description |
| :--- | :--- | :--- |
| id | String | ID Khách hàng (UUID) |
| fullName | String | Họ và tên |
| dob | DateTime | Ngày sinh |
| nationalId | String | CCCD/CMND (Duy nhất) |
| phone | String? | Số điện thoại |
| email | String? | Email liên hệ |
| address | String? | Địa chỉ thường trú |
| customerType | Enum | Loại khách hàng (VIP/Thường) |
| monthlyIncome | Decimal? | Thu nhập hàng tháng |
| creditScore | Int? | Điểm tín dụng nội bộ |
| images | Json | Danh sách ảnh hồ sơ (CCCD, chân dung) |
| wardId | String | ID Phường/Xã cư trú |
| createdAt | DateTime | Ngày tạo hồ sơ |
| updatedAt | DateTime | Ngày cập nhật hồ sơ |

### 3. Loan

```plantuml
@startuml
entity "Loan" as Loan {
  *id : String <<PK>>
  --
  loanCode : String
  customerId : String <<FK>>
  loanAmount : Decimal
  repaymentMethod : RepaymentMethod
  loanTypeId : Int <<FK>>
  durationMonths : Int
  appliedInterestRate : Decimal
  latePaymentPenaltyRate : Decimal
  totalInterest : Decimal
  totalFees : Decimal
  totalRepayment : Decimal
  monthlyPayment : Decimal
  startDate : DateTime?
  status : LoanStatus
  approvedAt : DateTime?
  approvedBy : String?
  rejectedAt : DateTime?
  rejectedBy : String?
  activatedAt : DateTime?
  remainingAmount : Decimal
  disbursedAt : DateTime?
  disbursedBy : String?
  disbursementMethod : DisbursementMethod?
  disbursementNote : String?
  notes : String?
  storeId : String <<FK>>
  createdAt : DateTime
  updatedAt : DateTime
  createdBy : String?
}
@enduml
```

| Field | Type | Description |
| :--- | :--- | :--- |
| id | String | ID Hợp đồng vay (UUID) |
| loanCode | String | Mã hợp đồng vay (Duy nhất) |
| customerId | String | ID Khách hàng vay |
| loanAmount | Decimal | Số tiền vay gốc |
| repaymentMethod | Enum | Phương thức trả nợ (Góp đều/Lãi trước) |
| loanTypeId | Int | Loại sản phẩm vay |
| durationMonths | Int | Thời hạn vay (Snapshot) |
| appliedInterestRate | Decimal | Lãi suất áp dụng (Snapshot) |
| latePaymentPenaltyRate | Decimal | Phí phạt quá hạn (Snapshot) |
| totalInterest | Decimal | Tổng lãi dự kiến |
| totalFees | Decimal | Tổng phí dịch vụ |
| totalRepayment | Decimal | Tổng tiền phải trả (Gốc + Lãi + Phí) |
| monthlyPayment | Decimal | Số tiền phải trả hàng tháng |
| startDate | DateTime? | Ngày bắt đầu tính lãi |
| status | Enum | Trạng thái hợp đồng |
| approvedAt | DateTime? | Thời điểm duyệt |
| approvedBy | String? | Người duyệt |
| rejectedAt | DateTime? | Thời điểm từ chối |
| rejectedBy | String? | Người từ chối |
| activatedAt | DateTime? | Thời điểm kích hoạt |
| remainingAmount | Decimal | Dư nợ gốc còn lại |
| disbursedAt | DateTime? | Thời điểm giải ngân |
| disbursedBy | String? | Người thực hiện giải ngân |
| disbursementMethod | Enum | Phương thức giải ngân |
| disbursementNote | String? | Ghi chú giải ngân |
| notes | String? | Ghi chú chung |
| storeId | String | ID Cửa hàng quản lý |
| createdAt | DateTime | Ngày tạo đơn vay |
| updatedAt | DateTime | Ngày cập nhật đơn vay |
| createdBy | String? | Người tạo đơn |

### 4. Repayment Schedule

```plantuml
@startuml
entity "RepaymentScheduleDetail" as RepaymentScheduleDetail {
  *id : String <<PK>>
  --
  loanId : String <<FK>>
  periodNumber : Int
  dueDate : DateTime
  beginningBalance : Decimal
  principalAmount : Decimal
  interestAmount : Decimal
  feeAmount : Decimal
  penaltyAmount : Decimal
  totalAmount : Decimal
  status : RepaymentItemStatus
  paidPrincipal : Decimal?
  paidInterest : Decimal?
  paidFee : Decimal?
  paidPenalty : Decimal?
  paidAt : DateTime?
  lastPenaltyAppliedAt : DateTime?
}
@enduml
```

| Field | Type | Description |
| :--- | :--- | :--- |
| id | String | ID Chi tiết lịch trả nợ |
| loanId | String | ID Hợp đồng vay |
| periodNumber | Int | Kỳ trả nợ số (1, 2, 3...) |
| dueDate | DateTime | Ngày đến hạn thanh toán |
| beginningBalance | Decimal | Dư nợ đầu kỳ |
| principalAmount | Decimal | Tiền gốc phải trả kỳ này |
| interestAmount | Decimal | Tiền lãi phải trả kỳ này |
| feeAmount | Decimal | Phí quản lý/lưu kho kỳ này |
| penaltyAmount | Decimal | Tiền phạt chậm trả (nếu có) |
| totalAmount | Decimal | Tổng cộng phải trả kỳ này |
| status | Enum | Trạng thái (Chờ, Đã trả, Quá hạn) |
| paidPrincipal | Decimal? | Gốc đã trả thực tế |
| paidInterest | Decimal? | Lãi đã trả thực tế |
| paidFee | Decimal? | Phí đã trả thực tế |
| paidPenalty | Decimal? | Phạt đã trả thực tế |
| paidAt | DateTime? | Ngày thanh toán thực tế |
| lastPenaltyAppliedAt | DateTime? | Ngày tính phạt gần nhất |

### 5. Payments

```plantuml
@startuml
entity "LoanPayment" as LoanPayment {
  *id : String <<PK>>
  --
  idempotencyKey : String?
  loanId : String <<FK>>
  storeId : String <<FK>>
  amount : Decimal
  paymentType : PaymentType
  paymentMethod : PaymentMethod
  paidAt : DateTime
  referenceCode : String?
  recorderEmployeeId : String?
  createdAt : DateTime
  updatedAt : DateTime
}

entity "PaymentAllocation" as PaymentAllocation {
  *id : String <<PK>>
  --
  paymentId : String <<FK>>
  componentType : PaymentComponent
  amount : Decimal
  note : String?
}
@enduml
```

**LoanPayment**
| Field | Type | Description |
| :--- | :--- | :--- |
| id | String | ID Giao dịch thanh toán |
| idempotencyKey | String? | Khóa chống trùng lặp |
| loanId | String | ID Hợp đồng vay |
| storeId | String | ID Cửa hàng thu tiền |
| amount | Decimal | Số tiền khách đóng |
| paymentType | Enum | Loại thanh toán (Định kỳ/Tất toán...) |
| paymentMethod | Enum | Phương thức (Tiền mặt/CK) |
| paidAt | DateTime | Thời điểm thanh toán |
| referenceCode | String? | Mã tham chiếu/Mã hóa đơn |
| recorderEmployeeId | String? | ID Nhân viên thu tiền |
| createdAt | DateTime | Ngày tạo bản ghi |
| updatedAt | DateTime | Ngày cập nhật bản ghi |

**PaymentAllocation**
| Field | Type | Description |
| :--- | :--- | :--- |
| id | String | ID Phân bổ thanh toán |
| paymentId | String | ID Giao dịch thanh toán gốc |
| componentType | Enum | Loại thành phần (Gốc/Lãi/Phí/Phạt) |
| amount | Decimal | Số tiền phân bổ cho thành phần này |
| note | String? | Ghi chú phân bổ |

### 6. Disbursement

```plantuml
@startuml
entity "Disbursement" as Disbursement {
  *id : String <<PK>>
  --
  idempotencyKey : String?
  loanId : String <<FK>>
  storeId : String <<FK>>
  amount : Decimal
  disbursementMethod : DisbursementMethod
  disbursedAt : DateTime
  referenceCode : String?
  disbursedBy : String?
  recipientName : String
  recipientIdNumber : String?
  witnessName : String?
  notes : String?
  bankTransferRef : String?
  bankAccountNumber : String?
  bankName : String?
  createdAt : DateTime
  updatedAt : DateTime
}
@enduml
```

| Field | Type | Description |
| :--- | :--- | :--- |
| id | String | ID Giao dịch giải ngân |
| loanId | String | ID Hợp đồng vay |
| storeId | String | ID Cửa hàng thực hiện |
| amount | Decimal | Số tiền giải ngân |
| disbursementMethod | Enum | Phương thức (Tiền mặt/CK) |
| disbursedAt | DateTime | Thời điểm giải ngân |
| referenceCode | String? | Mã phiếu chi |
| disbursedBy | String? | ID Nhân viên chi tiền |
| recipientName | String | Tên người nhận tiền |
| recipientIdNumber | String? | CMND/CCCD người nhận |
| witnessName | String? | Tên người làm chứng |
| notes | String? | Ghi chú |
| bankTransferRef | String? | Mã giao dịch ngân hàng |
| bankAccountNumber | String? | Số tài khoản nhận |
| bankName | String? | Tên ngân hàng nhận |

### 7. Collateral & Store

```plantuml
@startuml
entity "CollateralType" as CollateralType {
  *id : Int <<PK>>
  --
  name : String
  custodyFeeRateMonthly : Decimal
}

entity "Store" as Store {
  *id : String <<PK>>
  --
  name : String
  address : String?
  storeInfo : Json
  isActive : Boolean
  wardId : String <<FK>>
  createdAt : DateTime
  updatedAt : DateTime
}

entity "Collateral" as Collateral {
  *id : String <<PK>>
  --
  collateralTypeId : Int <<FK>>
  ownerName : String
  collateralInfo : Json
  status : CollateralStatus
  loanId : String? <<FK>>
  storageLocation : String?
  receivedDate : DateTime?
  appraisedValue : Decimal?
  ltvRatio : Decimal?
  appraisalDate : DateTime?
  appraisalNotes : String?
  images : Json
  sellPrice : Decimal?
  sellDate : DateTime?
  storeId : String? <<FK>>
  createdAt : DateTime
  updatedAt : DateTime
}
@enduml
```

**CollateralType**
| Field | Type | Description |
| :--- | :--- | :--- |
| id | Int | ID Loại tài sản |
| name | String | Tên loại tài sản (Xe máy, Laptop...) |
| custodyFeeRateMonthly | Decimal | Phí giữ hộ hàng tháng (%) |

**Store**
| Field | Type | Description |
| :--- | :--- | :--- |
| id | String | ID Cửa hàng |
| name | String | Tên cửa hàng |
| address | String? | Địa chỉ cụ thể |
| storeInfo | Json | Thông tin bổ sung |
| isActive | Boolean | Trạng thái hoạt động |
| wardId | String | ID Phường/Xã |
| createdAt | DateTime | Ngày tạo |
| updatedAt | DateTime | Ngày cập nhật |

**Collateral**
| Field | Type | Description |
| :--- | :--- | :--- |
| id | String | ID Tài sản |
| collateralTypeId | Int | Loại tài sản |
| ownerName | String | Tên chủ sở hữu |
| collateralInfo | Json | Thông tin chi tiết (Model, Serial...) |
| status | Enum | Trạng thái tài sản |
| loanId | String? | ID Hợp đồng vay (nếu đã cầm) |
| storageLocation | String? | Vị trí lưu kho |
| receivedDate | DateTime? | Ngày nhận tài sản |
| appraisedValue | Decimal? | Giá trị định giá |
| ltvRatio | Decimal? | Tỷ lệ vay trên giá trị (%) |
| appraisalDate | DateTime? | Ngày định giá |
| appraisalNotes | String? | Ghi chú định giá |
| images | Json | Ảnh tài sản |
| sellPrice | Decimal? | Giá bán thanh lý |
| sellDate | DateTime? | Ngày bán thanh lý |
| storeId | String? | ID Cửa hàng quản lý |

### 8. System & Audit

```plantuml
@startuml
entity "SystemParameter" as SystemParameter {
  *id : Int <<PK>>
  --
  paramGroup : String?
  paramKey : String
  paramValue : String
  dataType : String?
  description : String?
  isActive : Boolean
  createdAt : DateTime
  updatedAt : DateTime
}

entity "AuditLog" as AuditLog {
  *id : String <<PK>>
  --
  action : String
  entityId : String
  entityType : AuditEntityType
  entityName : String?
  actorId : String?
  actorName : String?
  oldValue : Json?
  newValue : Json?
  description : String?
  createdAt : DateTime
}
@enduml
```

**SystemParameter**
| Field | Type | Description |
| :--- | :--- | :--- |
| id | Int | ID Tham số |
| paramGroup | String? | Nhóm tham số |
| paramKey | String | Mã tham số (Key) |
| paramValue | String | Giá trị tham số |
| dataType | String? | Kiểu dữ liệu (STRING, NUMBER...) |
| description | String? | Mô tả ý nghĩa |
| isActive | Boolean | Trạng thái kích hoạt |

**AuditLog**
| Field | Type | Description |
| :--- | :--- | :--- |
| id | String | ID Nhật ký |
| action | String | Hành động thực hiện |
| entityId | String | ID Đối tượng bị tác động |
| entityType | Enum | Loại đối tượng |
| entityName | String? | Tên đối tượng |
| actorId | String? | ID Người thực hiện |
| actorName | String? | Tên người thực hiện |
| oldValue | Json? | Dữ liệu cũ |
| newValue | Json? | Dữ liệu mới |
| description | String? | Mô tả chi tiết hành động |
| createdAt | DateTime | Thời điểm ghi nhật ký |

### 9. Revenue & Location

```plantuml
@startuml
entity "RevenueLedger" as RevenueLedger {
  *id : String <<PK>>
  --
  type : RevenueType
  amount : Decimal
  refId : String
  storeId : String <<FK>>
  recordedAt : DateTime
}

entity "Location" as Location {
  *id : String <<PK>>
  --
  code : String
  name : String
  level : LocationLevel
  parentId : String? <<FK>>
}
@enduml
```

**RevenueLedger**
| Field | Type | Description |
| :--- | :--- | :--- |
| id | String | ID Sổ cái doanh thu |
| type | Enum | Loại doanh thu (Lãi/Phí/Thanh lý) |
| amount | Decimal | Số tiền |
| refId | String | ID Tham chiếu (Loan/Payment) |
| storeId | String | ID Cửa hàng |
| recordedAt | DateTime | Thời điểm ghi nhận |

**Location**
| Field | Type | Description |
| :--- | :--- | :--- |
| id | String | ID Địa danh |
| code | String | Mã địa danh |
| name | String | Tên địa danh (Tỉnh/Huyện/Xã) |
| level | Enum | Cấp hành chính |
| parentId | String? | ID Đơn vị cấp trên |

### 10. Notification Log

```plantuml
@startuml
entity "NotificationLog" as NotificationLog {
  *id : String <<PK>>
  --
  type : NotificationType
  channel : NotificationChannel
  status : NotificationStatus
  loanId : String <<FK>>
  customerId : String <<FK>>
  subject : String?
  message : String?
  recipientContact : String?
  callDuration : Int?
  employeeId : String?
  notes : String?
  promiseToPayDate : DateTime?
  sentAt : DateTime?
  createdAt : DateTime
  updatedAt : DateTime
}
@enduml
```

| Field | Type | Description |
| :--- | :--- | :--- |
| id | String | ID Nhật ký thông báo |
| type | Enum | Loại thông báo |
| channel | Enum | Kênh gửi (SMS/Email/Call) |
| status | Enum | Trạng thái gửi |
| loanId | String | ID Khoản vay liên quan |
| customerId | String | ID Khách hàng nhận |
| subject | String? | Tiêu đề |
| message | String? | Nội dung tin nhắn |
| recipientContact | String? | Số điện thoại/Email nhận |
| callDuration | Int? | Thời lượng gọi (giây) |
| employeeId | String? | ID Nhân viên gọi điện |
| notes | String? | Ghi chú kết quả |
| promiseToPayDate | DateTime? | Ngày hứa trả nợ |
| sentAt | DateTime? | Thời điểm gửi thành công |
