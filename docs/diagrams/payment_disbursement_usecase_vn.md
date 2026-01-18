# Biểu đồ Use Case - Quản lý Thanh toán và Giải ngân (Payment & Disbursement)

Dưới đây là biểu đồ Use Case mô tả các tác vụ và quy trình nghiệp vụ liên quan đến **Thanh toán (Payment)** và **Giải ngân (Disbursement)** trong hệ thống, dựa trên API hiện có.

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Nhân viên" as Employee
actor "Quản lý" as Manager

package "Quản lý Thanh toán & Giải ngân" {
    usecase "Xem danh sách thanh toán" as UC_Payment_List
    usecase "Tạo phiếu thanh toán" as UC_Payment_Create
    usecase "Xem danh sách giải ngân" as UC_Disbursement_List
    usecase "Tạo phiếu giải ngân" as UC_Disbursement_Create
}

' Quan hệ giữa các actor
Employee <|-- Manager : Kế thừa quyền hạn

' Gán Use Case cho Actor
Employee --> UC_Payment_List
Employee --> UC_Payment_Create
Employee --> UC_Disbursement_List

' Manager có quyền đặc biệt
Manager --> UC_Disbursement_Create

' Note bổ sung thông tin
note right of UC_Disbursement_Create
  Chỉ Quản lý mới có quyền
  tạo bảo chi giải ngân cho khoản vay
end note

@enduml
```
