import {Entity, PrimaryColumn, Column, AfterLoad } from "typeorm";
import * as moment from "moment"

@Entity({
    name:"location_history"
})
export class LocationHistory {

    @PrimaryColumn("uuid")
    id: string;

    @Column("uuid")
    vehicle_id: string;

    @Column({
        type:"timestamp"
    })
    ts: string;

    @Column({ type: 'decimal', precision: 5, scale: 1})
    longitude: number;

    @Column({ type: 'decimal', precision: 5, scale: 1})
    latitude: number;

    @AfterLoad()
    formatTime(){
        const pattern = 'YYYY-MM-DD HH:mm:ss'
        this.ts = moment(this.ts).format(pattern)
    }
}