import { Injectable } from '@nestjs/common';
import type { ApiResponse } from '@ragflux/shared/common';

export enum ResponseCode {
  SUCCESS = 0,
  ERROR = 1,
}

@Injectable()
export class ResponseService {
  success<T>(data: T, msg: string = 'success'): ApiResponse<T> {
    return {
      code: ResponseCode.SUCCESS,
      msg,
      data,
    };
  }

  error<T>(data: T, msg: string = 'error'): ApiResponse<T> {
    return {
      code: ResponseCode.ERROR,
      msg,
      data,
    };
  }
}
