import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity()
export class Rides {

    @PrimaryColumn("uuid")
    id: string;

    @Column("uuid")
    vehicle_id: string;

    @Column()
    user_email: string;

    @Column({
        type:"timestamp"
    })
    start_ts: String;

    @Column({
        type:"timestamp", 
        default: null
    })
    end_ts: String;

}