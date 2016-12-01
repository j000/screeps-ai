var CONST = {
    RAMPART_MAX: 500000,
    RAMPART_FIX: 50000,
    WALL_MAX: 300000000,
    WALL_FIX: 50000,
    RAMPART_HITS_MAX: {      // Maximum health of a rampart
        1: 0,
        2: 300000,
        3: 1000000,
        4: 3000000,
        5: 10000000,
        6: 30000000,
        7: 100000000,
        8: 300000000
    }
};
var Cache = require('Cache');

function Constructions(room) {
    this.room = room;
    this.cache = new Cache();
    this.sites = this.room.find(FIND_CONSTRUCTION_SITES);
    this.structures = this.room.find(FIND_MY_STRUCTURES);
    this.damagedStructures = this.getDamagedStructures();
    this.upgradeableStructures = this.getUpgradeableStructures();
    this.controller = this.room.controller;
};

Constructions.prototype.getRampartMax = function() {
    if (RAMPART_HITS_MAX[Math.min(this.controller.level, 8)] != null)
        return RAMPART_HITS_MAX[Math.min(this.controller.level, 8)];
    return CONST.RAMPART_HITS_MAX[Math.min(this.controller.level, 8)];
}


Constructions.prototype.getDamagedStructures = function() {
    return this.cache.remember(
        'damaged-structures',
        function() {
            return this.room.find(
                FIND_STRUCTURES,
                {
                    filter: function(s) {
                        var targets = s.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
						if(targets.length != 0) {
						    return false;
						}
                        if(s.my) {
                            if((s.hits < s.hitsMax/2 && s.structureType != STRUCTURE_RAMPART) || (s.structureType == STRUCTURE_RAMPART && s.hits < CONST.RAMPART_FIX)) {
                                return true;
                            }
                        }else {
                            if(s.structureType == STRUCTURE_WALL && s.hits < CONST.WALL_FIX) {
                                return true;
                            }
                        }

                    }
                }
            );
        }.bind(this)
    );
};

Constructions.prototype.getUpgradeableStructures = function() {
    return this.cache.remember(
        'upgradeable-structures',
        function() {
            return this.room.find(
                FIND_MY_STRUCTURES,
                {
                    filter: function(s) {
                        var targets = s.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
                        if(targets.length != 0) {
                            return false;
                        }
                        if(s.my) {
                            if((s.hits < s.hitsMax && s.structureType != STRUCTURE_RAMPART) || (s.structureType == STRUCTURE_RAMPART && s.hits < this.getRampartMax())) {

                                return true;
                            }
                        } else {
                            if(s.structureType == STRUCTURE_WALL && s.hits < CONST.WALL_MAX) {
                                return true;
                            }
                        }
                    }
                }
            );
        }.bind(this)
    );
};

Constructions.prototype.getConstructionSiteById = function(id) {
    return this.cache.remember(
        'object-id-' + id,
        function() {
            return Game.getObjectById(id);
        }.bind(this)
    );
};

Constructions.prototype.getController = function() {
    return this.controller;
};

Constructions.prototype.getClosestConstructionSite = function(creep) {
    var site = false;
    if(this.sites.length != 0) {
        site = creep.pos.findClosestByPath(this.sites);
    }

    return site;
};


Constructions.prototype.constructStructure = function(creep) {
    var avoidArea = creep.getAvoidedArea();

    if(this.sites.length != 0) {
        site = creep.creep.pos.findClosestByRange(this.sites);
        if (creep.creep.build(site) == ERR_NOT_IN_RANGE) {
            creep.creep.moveTo(site, {avoid: avoidArea});
        }

        return site;
    }

    if(this.controller.level <= 2) {
        site = this.getController();
        if (creep.creep.upgradeController(site) == ERR_NOT_IN_RANGE) {
            creep.creep.moveTo(site, {avoid: avoidArea});
        }
        return site;
    }

    if(this.damagedStructures.length != 0) {
        site = creep.creep.pos.findClosestByPath(this.damagedStructures);
        if (creep.creep.repair(site) == ERR_NOT_IN_RANGE) {
            creep.creep.moveTo(site, {avoid: avoidArea});
        }

        return site;
    }

    if(this.upgradeableStructures.length != 0) {
        site = creep.creep.pos.findClosestByPath(this.upgradeableStructures);
        if (creep.creep.repair(site) == ERR_NOT_IN_RANGE) {
            creep.creep.moveTo(site, {avoid: avoidArea});
        }

        return site;
    }

    return false;
};


module.exports = Constructions;
