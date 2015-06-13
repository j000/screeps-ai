var ScoutHandler = {
    roomHandler: {}
};

ScoutHandler.scouts = [];

ScoutHandler.loadScouts = function() {
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        var role = creep.memory.role || creep.name.split('-')[0];
        if(role == 'CreepScout') {
            var c = new CreepScout(creep, this.roomHandler);
            HelperFunctions.extend(c, CreepBase);
            c.init();
        }
    }
};

ScoutHandler.setRoomHandler = function(roomHandler) {
    this.roomHandler = roomHandler;
};

ScoutHandler.spawnNewScouts = function() {
    // TODO: Go through each room, check if it can create scouts.
    // Check room controller level 3?
    /*
    if(rooms[i].population.goalsMet() == true) {
        rooms[i].creepFactory.new('CreepScout', rooms[i].depositManager.getSpawnDeposit());
    }
    */
}

module.exports = ScoutHandler;