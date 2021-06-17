import {Entity, PrimaryColumn, Column, OneToMany} from "typeorm";
import { Rides } from "./Rides";

@Entity()
export class Users {

    @PrimaryColumn()
    email: string;

    @Column()
    first_name: string;

    @Column()
    last_name: string;

    @Column("string", { array: true })
    phone_numbers: string[];
    
}
