# Biểu đồ Use Case Tổng quan Hệ thống (High-Level System Overview)

Biểu đồ dưới đây cung cấp cái nhìn toàn cảnh về phạm vi chức năng của hệ thống Quản lý Cầm đồ (Pawn Manager), phân chia theo các phân hệ nghiệp vụ chính và các tác nhân tương tác.

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

' --- ACTORS ---
actor "Nhân viên (Loan Officer)" as Staff
actor "Quản lý (Store Manager)" as Manager
actor "Quản trị viên (Admin)" as Admin

' Manager có thể làm mọi việc của Staff
Staff <|-- Manager

' --- PACKAGES ---

package "Quản trị Hệ thống (System Admin)" {
    usecase "Quản lý Cửa hàng (Store)" as UC_Manage_Store
    usecase "Quản lý Nhân viên" as UC_Manage_Employee
    usecase "Cấu hình Tham số hệ thống" as UC_Sys_Config
}

package "Quản lý Danh mục (Catalog)" {
    usecase "Quản lý Loại tài sản & Lãi suất" as UC_Manage_AssetType
}

package "Quản lý Khách hàng (Customer)" {
    usecase "Quản lý Hồ sơ Khách hàng" as UC_Manage_Customer
    usecase "Tra cứu lịch sử tín dụng" as UC_Credit_Check
}

package "Nghiệp vụ Cầm đồ (Core Business)" {
    usecase "Thẩm định & Định giá Tài sản" as UC_Appraise_Asset
    usecase "Tạo Hồ sơ vay (Cầm đồ)" as UC_Create_Loan
    usecase "Duyệt / Từ chối khoản vay" as UC_Approve_Loan
    usecase "Thu nợ (Gốc/Lãi/Phí)" as UC_Collect_Payment
    usecase "Nhắc nợ & Xử lý quá hạn" as UC_Remind_Debt
}

package "Quản lý Kho & Thanh lý" {
    usecase "Nhập kho / Xuất kho Tài sản" as UC_Warehousing
    usecase "Thanh lý tài sản quá hạn" as UC_Liquidation
}

package "Báo cáo & Thống kê (Reporting)" {
    usecase "Xem báo cáo Doanh thu/Lợi nhuận" as UC_Report_Revenue
    usecase "Xem báo cáo Quỹ tiền mặt" as UC_Report_Cashflow
    usecase "Xem báo cáo Tồn kho" as UC_Report_Inventory
}

' --- RELATIONS ---

' Admin Actions
Admin --> UC_Manage_Store
Admin --> UC_Manage_Employee
Admin --> UC_Sys_Config
Admin --> UC_Manage_AssetType
Admin --> UC_Report_Revenue

' Staff Actions (Core)
Staff --> UC_Manage_Customer
Staff --> UC_Credit_Check
Staff --> UC_Appraise_Asset
Staff --> UC_Create_Loan
Staff --> UC_Collect_Payment
Staff --> UC_Remind_Debt
Staff --> UC_Warehousing

' Manager Actions (Higher privileges)
Manager --> UC_Approve_Loan
Manager --> UC_Liquidation
Manager --> UC_Report_Revenue
Manager --> UC_Report_Cashflow
Manager --> UC_Report_Inventory

note right of UC_Approve_Loan
  Manager duyệt dựa trên
  giá trị tài sản và hạn mức
end note

note right of UC_Liquidation
  Xử lý tài sản khi khách
  không chuộc đúng hạn
end note

@enduml
```

## Giải thích các tác nhân (Actors):

1.  **Nhân viên (Loan Officer/Clerk):**
    - Là người trực tiếp giao dịch với khách hàng tại cửa hàng.
    - Nhiệm vụ chính: Tạo hồ sơ khách hàng, thẩm định sơ bộ tài sản, tạo hợp đồng vay, thu tiền lãi/gốc định kỳ, và quản lý việc cất giữ/trả lại tài sản trong kho.

2.  **Quản lý (Store Manager):**
    - Chịu trách nhiệm về hoạt động của một cửa hàng cụ thể.
    - Có toàn quyền của Nhân viên, cộng thêm quyền phê duyệt các khoản vay (đặc biệt các khoản giá trị lớn), quyết định thanh lý tài sản quá hạn, và xem các báo cáo tài chính chi tiết của cửa hàng.

3.  **Quản trị viên (Admin):**
    - Người quản lý cấu hình toàn hệ thống.
    - Nhiệm vụ chính: Thiết lập danh sách cửa hàng, tạo tài khoản cho nhân viên/quản lý, cấu hình các loại tài sản (tỷ lệ định giá, lãi suất khung), và xem báo cáo tổng hợp toàn chuỗi.

## Các phân hệ chính:

- **Quản trị hệ thống & Danh mục:** Nơi thiết lập nền tảng dữ liệu (Cửa hàng, Loại tài sản, Nhân sự).
- **Nghiệp vụ Cầm đồ:** Luồng chính của phần mềm từ lúc khách đến vay, thẩm định, tạo hợp đồng cho đến khi thanh toán.
- **Quản lý Kho & Thanh lý:** Quản lý vòng đời vật lý của tài sản cầm cố.
- **Báo cáo:** Cung cấp số liệu ra quyết định cho quản lý.
