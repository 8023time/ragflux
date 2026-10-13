import { Injectable } from '@nestjs/common';

export enum ResponseCode {
  SUCCESS = 0,
  ERROR = 1,
}

export interface HttpResponse<T> {
  code: ResponseCode;
  msg: string;
  data: T;
}

@Injectable()
export class ResponseService {
  success<T>(data: T, msg: string = 'success'): HttpResponse<T> {
    return {
      code: ResponseCode.SUCCESS,
      msg,
      data,
    };
  }

  error<T>(data: T, msg: string = 'error'): HttpResponse<T> {
    return {
      code: ResponseCode.ERROR,
      msg,
      data,
    };
  }
}
