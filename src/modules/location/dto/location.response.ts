import { ApiProperty } from '@nestjs/swagger';

export class ProvinceResponse {
  id: string;
  @ApiProperty({ example: '01' })
  code: string;
  @ApiProperty({ example: 'Hà Nội' })
  name: string;
}

export class WardResponse {
  id: string;
  @ApiProperty({ example: '001' })
  code: string;
  @ApiProperty({ example: 'Phường Phúc Xá' })
  name: string;
  @ApiProperty({ example: '01' })
  parentId: string;
}
