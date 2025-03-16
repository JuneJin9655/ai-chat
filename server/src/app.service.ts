import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./users/entities/user.entity";
import { Role } from "./common/enums/roles.enum";
import * as bcrypt from 'bcryptjs'

@Injectable()
export class AppService implements OnModuleInit {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async onModuleInit() {
        const adminExists = await this.userRepository.findOne({ where: { role: Role.ADMIN } });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin0609', 10);
            const adminUser = this.userRepository.create({
                username: 'Admin',
                password: hashedPassword,
                role: Role.ADMIN,
            });
            await this.userRepository.save(adminUser);
            console.log('Admin user created successfully');
        }
    }
}