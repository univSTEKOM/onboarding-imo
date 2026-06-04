import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'bun:test';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersService } from './users/users.service';
import { RolesService } from './roles/roles.service';
import { PermissionsService } from './permissions/permissions.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: UsersService, useValue: {} },
        { provide: RolesService, useValue: {} },
        { provide: PermissionsService, useValue: {} },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
