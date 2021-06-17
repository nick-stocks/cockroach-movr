import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";
import { LocationHistory } from "./LocationHistory";

@Entity()
export class Vehicles {

    @PrimaryColumn("uuid")
    id: string;

    @Column()
    battery: number;

    @Column()
    in_use: boolean;

    @Column("jsonb")
    vehicle_info: any;

    @OneToMany(type => LocationHistory, LocationHistory => LocationHistory.vehicle_id) locationHistory: LocationHistory[];  
}