/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('harvester'); // -> 'a thing'
 */
var Cache = require('Cache');
var ACTIONS = {
	HARVEST: 1,
	DEPOSIT: 2
};
var DEPOSIT_FOR = {
	CONSTRUCTION: 1,
	POPULATION: 2
}

function CreepCarrier(creep, depositManager, resourceManager, constructionsManager) {
	this.cache = new Cache();
	this.creep = creep;
	this.depositManager = depositManager;
	this.resourceManager = resourceManager;
	this.constructionsManager = constructionsManager;
	this.resource = false;
	this.target = false;
};

CreepCarrier.prototype.init = function() {
	this.remember('role', 'CreepCarrier');
	this.depositFor = this.remember('depositFor') || 2;

	if(this.creep.fatigue != 0) {
		return;
	}

	if(!this.remember('source')) {
		var src = this.resourceManager.getAvailableResource();
		this.remember('source', src.id);
	} else {
		this.resource = this.resourceManager.getResourceById(this.remember('source'));
	}

	if(!this.remember('srcRoom')) {
		this.remember('srcRoom', this.creep.room.name);
	}

	if(this.moveToNewRoom() == true) {
		return;
	}

	if(this.randomMovement() == false) {
	    this.act();
	}
};

CreepCarrier.prototype.onRandomMovement = function() {
	this.remember('last-action', ACTIONS.DEPOSIT);
}

CreepCarrier.prototype.setDepositFor = function(type) {
	this.remember('depositFor', type);
}
CreepCarrier.prototype.getDepositFor = function() {
	return this.remember('depositFor');
}

CreepCarrier.prototype.act = function() {
	var continueDeposit = false;
	if(this.creep.carry.energy != 0 && this.remember('last-action') == ACTIONS.DEPOSIT) {
		continueDeposit = true;
	}

	if(this.creep.carry.energy < this.creep.carryCapacity && continueDeposit == false) {
		if(this.pickupEnergy()) {
			return;
		}
		this.harvestEnergy();
	} else {
		this.depositEnergy();
	}
};

CreepCarrier.prototype.depositEnergy = function() {
	var avoidArea = this.getAvoidedArea();

	if(this.depositManager.getEmptyDeposits().length == 0 && this.depositManager.getSpawnDeposit().energy == this.depositManager.getSpawnDeposit().energyCapacity) {
		this.depositFor = DEPOSIT_FOR.CONSTRUCTION;
	}

	if(this.depositManager.energy() / this.depositManager.energyCapacity() < 0.3) {
		this.depositFor = DEPOSIT_FOR.POPULATION;
	}

	if(this.depositFor == DEPOSIT_FOR.POPULATION) {
		var deposit = this.getDeposit();
		if (this.creep.transfer(deposit, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
			this.creep.moveTo(deposit, {avoid: avoidArea});
		}
	}

	if(this.depositFor == DEPOSIT_FOR.CONSTRUCTION) {
		var worker = this.getWorker();
		var range = 1;
		if(!worker) {
			this.remember('target-worker', false);
			worker = this.constructionsManager.controller;
			range = 2;
		}

		if(!this.creep.pos.isNearTo(worker, range)) {
			this.creep.moveTo(worker, {avoid: avoidArea});
		} else {
			this.remember('move-attempts', 0);
		}
		this.harvest();
	}

	this.remember('last-action', ACTIONS.DEPOSIT);
}

CreepCarrier.prototype.getWorker = function() {
	if(this.remember('target-worker')) {
		return Game.getObjectById(this.remember('target-worker'));
	}

	return false;
}
CreepCarrier.prototype.getDeposit = function() {
	return this.cache.remember(
		'selected-deposit',
		function() {
			var deposit = false;

			// Deposit energy
			if(this.remember('closest-deposit')) {
				deposit = this.depositManager.getEmptyDepositOnId(this.remember('closest-deposit'));
				return deposit;
			}

			deposit = this.depositManager.getClosestEmptyDeposit(this.creep);
			this.remember('closest-deposit', deposit.id);
			return deposit;

			deposit = this.depositManager.getSpawnDeposit();

			return deposit;
		}.bind(this)
	)
};
CreepCarrier.prototype.pickupEnergy = function() {
	var avoidArea = this.getAvoidedArea();
	if(this.creep.carry.energy == this.creep.carry.energyCapacity) {
		return false;
	}

	var targets = this.creep.pos.findInRange(FIND_DROPPED_ENERGY, 3, {avoid: avoidArea});
	if(!targets.length)
		return false;

	var target = this.creep.pos.findClosestByRange(targets);
	/*var target = targets[0];*/
	//if (target.amount < this.creep.carry.energyCapacity)
	for (let i in targets) {
		if (targets[i].amount > 2*target.amount)
			target = targets[i];
	}
	//this.creep.say('P:'+target.pos.x+','+target.pos.y);
	if (this.creep.pickup(target) == ERR_NOT_IN_RANGE) {
		this.creep.moveTo(target, {avoid: avoidArea});
	}
	return true;
};
CreepCarrier.prototype.harvestEnergy = function() {
	//this.creep.moveTo(0,0);
	var avoidArea = this.getAvoidedArea();

	this.creep.moveTo(this.resource, {avoid: avoidArea});
	if(this.creep.pos.inRangeTo(this.resource, 3)) {
		this.harvest();
	}
	this.remember('last-action', ACTIONS.HARVEST);
	this.forget('closest-deposit');
}

CreepCarrier.prototype.harvest = function() {
	var creepsNear = this.creep.pos.findInRange(FIND_MY_CREEPS, 1);
	if(creepsNear.length){
		for(var n in creepsNear){
			if(creepsNear[n].memory.role === 'CreepMiner' && creepsNear[n].energy != 0){
				creepsNear[n].transfer(this.creep, RESOURCE_ENERGY);
			} else if(creepsNear[n].memory.role === 'CreepBuilder'){
				this.creep.transfer(creepsNear[n], RESOURCE_ENERGY);
			}
		}
	}
}

require('screeps-profiler').registerObject(CreepCarrier, 'CreepCarrier');

module.exports = CreepCarrier;
