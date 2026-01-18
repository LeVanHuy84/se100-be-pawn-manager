# Biểu đồ Use Case - Quản lý Báo cáo (Report Actions)

Dưới đây là biểu đồ Use Case mô tả các tác vụ và quy trình nghiệp vụ liên quan đến **Báo cáo (Reports)** trong hệ thống, dựa trên API hiện có.

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Nhân viên" as Employee
actor "Quản lý" as Manager

package "Quản lý Báo cáo" {
    usecase "Xem sổ quản lý hàng ngày\n(Dùng cho công an)" as UC_DailyLog
    usecase "Xem báo cáo doanh thu" as UC_Revenue
    usecase "Xem báo cáo quý\n(Mẫu ĐK13)" as UC_Quarterly
    usecase "Lọc báo cáo theo thời gian & chi nhánh" as UC_Filter
}

' Quan hệ giữa các actor
Employee <|-- Manager : Kế thừa quyền hạn

' Gán Use Case cho Actor
Employee --> UC_DailyLog

' Manager có quyền đặc biệt
Manager --> UC_Revenue
Manager --> UC_Quarterly

' Các include relationship
UC_DailyLog ..> UC_Filter : <<include>>
UC_Revenue ..> UC_Filter : <<include>>
UC_Quarterly ..> UC_Filter : <<include>>

' Note bổ sung thông tin
note right of UC_Revenue
  Bao gồm chi tiết: Lãi suất,
  phí dịch vụ, phí trễ hạn,
  và thanh lý tài sản.
end note

note right of UC_DailyLog
  Theo dõi các hợp đồng mới
  và đã đóng trong ngày
  để ghi sổ công an.
end note

note right of UC_Quarterly
  Báo cáo tổng hợp tình hình
  kinh doanh và tuân thủ
  theo mẫu ĐK13.
end note

@enduml
```
