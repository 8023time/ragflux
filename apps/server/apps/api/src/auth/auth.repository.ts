import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@libs/database';

export type UserRow = {
  id: number;
  email: string;
  nickname: string;
};

@Injectable()
export class AuthRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /** 按用户编号查询用户。
   * @param id 用户编号
   * @returns 用户记录，不存在时返回 null
   */
  findById(id: number) {
    return this.databaseService.client.orm.public.User.where((row) => row.id.eq(id)).first();
  }

  /** 按邮箱查找用户，不存在时创建用户。
   * @param email 用户邮箱
   * @param nickname 初始昵称
   * @returns 用户记录
   */
  async findOrCreateByEmail(email: string, nickname: string): Promise<UserRow> {
    const existing = await this.findByEmail(email);
    if (existing) {
      return existing;
    }
    try {
      return await this.databaseService.client.orm.public.User.create({ email, nickname });
    } catch (error) {
      const again = await this.findByEmail(email);
      if (again) {
        return again;
      }
      throw error;
    }
  }

  /** 按邮箱查询用户。
   * @param email 用户邮箱
   * @returns 用户记录，不存在时返回 null
   */
  private findByEmail(email: string) {
    return this.databaseService.client.orm.public.User.where((row) => row.email.eq(email)).first();
  }
}
