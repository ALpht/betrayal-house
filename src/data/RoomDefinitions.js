import RoomTile from "../model/RoomTile.js";

export default [

    new RoomTile(
        1,
        "Library",
        {
            north:true,
            east:false,
            south:true,
            west:false
        }
    ),

    new RoomTile(
        2,
        "Kitchen",
        {
            north:true,
            east:true,
            south:false,
            west:false
        }
    ),

    new RoomTile(
        3,
        "Dining Room",
        {
            north:true,
            east:true,
            south:true,
            west:false
        }
    ),

    new RoomTile(
        4,
        "Laboratory",
        {
            north:true,
            east:true,
            south:true,
            west:true
        }
    )
];