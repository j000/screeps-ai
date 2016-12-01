/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('Builder'); // -> 'a thing'
 */
var CreepBuilder = function(creep, depositManager, constructionManager) {
	this.creep = creep;
	this.depositManager = depositManager;
	this.constructionManager = constructionManager;
	this.forceControllerUpgrade = false;
};

CreepBuilder.prototype.init = function() {
	this.remember('role', 'CreepBuilder');
	if(!this.remember('srcRoom')) {
		this.remember('srcRoom', this.creep.room.name);
	}

	if(this.creep.fatigue != 0) {
		return;
	}

	if(this.moveToNewRoom() == true) {
		return;
	}

	this.forceControllerUpgrade = this.remember('forceControllerUpgrade');

	//if(this.randomMovement() == false) {
		this.act();
	//}
};

CreepBuilder.prototype.act = function() {
	var site = false;
	var avoidArea = this.getAvoidedArea();
	if(!this.forceControllerUpgrade) {
		site = this.constructionManager.constructStructure(this);
	}

	if(!site) {
		var site = this.constructionManager.getController();
		if (this.creep.upgradeController(site) == ERR_NOT_IN_RANGE) {
			this.creep.moveTo(site, {avoid: avoidArea});
		}
	}

	if(this.creep.pos.inRangeTo(site, 3)) {
		this.giveEnergy(site);
	}
	this.remember('last-energy', this.creep.carry.energy);
};

CreepBuilder.prototype.giveEnergy = function(site) {
	var creepsNear = this.creep.pos.findInRange(FIND_MY_CREEPS, 1);
	if(creepsNear.length){
		if(site) {
			var closest = site.pos.findClosestByPath(creepsNear.concat(this.creep),{
				filter: (c) => (c.carry.energy == 0)
			});

			if(closest != this.creep) {
				//this.creep.transferEnergy(closest);
				this.creep.transfer(closest, RESOURCE_ENERGY);
			}
			return;
		}
		for(var n in creepsNear){
			if(creepsNear[n].memory.role === 'CreepBuilder'){
				if(creepsNear[n].memory['last-energy'] > creepsNear[n].carry.energy) {
					//this.creep.transferEnergy(creepsNear[n]);
					this.creep.transfer(creepsNear[n], RESOURCE_ENERGY);
				}
			}
		}
	}
}

require('screeps-profiler').registerObject(CreepBuilder, 'CreepBuilder');

module.exports = CreepBuilder;
