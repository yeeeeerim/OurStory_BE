import { Injectable } from '@nestjs/common';

@Injectable()
export class DiaryService {
  create(createDiaryDto: any) {
    return 'This action adds a new diary';
  }

  findAll() {
    return `This action returns all diary`;
  }

  findOne(id: string) {
    return `This action returns a #${id} diary`;
  }

  update(id: string, updateDiaryDto: any) {
    return `This action updates a #${id} diary`;
  }

  remove(id: string) {
    return `This action removes a #${id} diary`;
  }
}
