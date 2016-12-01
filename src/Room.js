var Deposits = require('Deposits');
var CreepFactory = require('CreepFactory');
var Population = require('Population');
var Resources = require('Resources');
var Constructions = require('Constructions');

function Room(room, roomHandler) {
	this.room = room;
	this.roomHandler = roomHandler;
	this.creeps = [];
	this.structures = [];

	this.population = new Population(this.room);
	this.depositManager = new Deposits(this.room);
	this.resourceManager = new Resources(this.room, this.population);
	this.constructionManager = new Constructions(this.room);
	this.population.typeDistribution.CreepBuilder.max = 4;
	var miners = 0;
	var sources = this.resourceManager.getSources();
	for (let i in sources) {
		let tmp = sources[i].pos;
		for (let x = -1; x < 2; ++x) {
			for (let y = -1; y < 2; ++y) {
				if (x == 0 && y == 0)
					continue;
				if (Game.map.getTerrainAt(tmp.x+x, tmp.y+y, tmp.roomName) != 'wall') {
					++miners;
				}
			}
		}
	}
	this.population.typeDistribution.CreepMiner.max = miners;
	//this.population.typeDistribution.CreepMiner.max = (this.resourceManager.getSources().length)*2;
	this.population.typeDistribution.CreepCarrier.max = this.population.typeDistribution.CreepBuilder.max+this.population.typeDistribution.CreepMiner.max;
	this.creepFactory = new CreepFactory(this.depositManager, this.resourceManager, this.constructionManager, this.population, this.roomHandler);
}

Room.prototype.askForReinforcements = function() {
	console.log(this.room.name + ': ask for reinforcements.');
	this.roomHandler.requestReinforcement(this);
};

Room.prototype.sendReinforcements = function(room) {
	if(!Memory[this.room.name]) {
		Memory[this.room.name] = {};
	}
	var alreadySending = false;
	for(var i = 0; i < this.population.creeps.length; i++) {
		var creep = this.population.creeps[i];
		if(creep.memory.targetRoom == room.room.name) {
			alreadySending = true;
			break;
		}
	}
	if(alreadySending) {
		console.log(this.room.name + ': already given reinforcements');
		return;
	}
	if(this.population.getTotalPopulation() < this.population.getMaxPopulation()*0.8) {
		console.log(this.room.name + ': Not enough resources ' + '(' + this.population.getTotalPopulation() + '/' + this.population.getMaxPopulation()*0.8 + ')');
		return;
	}

	var sentType = [];
	for(var i = 0; i < this.population.creeps.length; i++) {
		var creep = this.population.creeps[i];
		if(creep.ticksToLive < 1000) {
			continue;
		}
		if(sentType.indexOf(creep.memory.role) == -1) {
			sentType.push(creep.memory.role);
			console.log('sending: ' + creep.memory.role);
			creep.memory.targetRoom = room.room.name;
		}
	}
}

Room.prototype.populate = function() {
	if(this.depositManager.spawns.length == 0 || this.population.getTotalPopulation() < 10) {
		//this.askForReinforcements()
	}

	for(var i = 0; i < this.depositManager.spawns.length; i++) {
		var spawn = this.depositManager.spawns[i];
		if(spawn.spawning) {
			continue;
		}

		if((this.depositManager.energy() / this.depositManager.energyCapacity()) > 0.2 || this.population.getTotalPopulation() < 10) {
			var types = this.population.getTypes()
			for(var i = 0; i < types.length; i++) {
				var ctype = this.population.getType(types[i]);
				if(this.depositManager.deposits.length >= ctype.minExtensions) {
					if((ctype.goalPercentage > ctype.currentPercentage && ctype.total < ctype.max) || ctype.total == 0 || ctype.total < ctype.max*0.75) {
						this.creepFactory.new(types[i], this.depositManager.getSpawnDeposit());
						break;
					}
				}
			}
		}
	}

};

Room.prototype.loadCreeps = function() {
	var creeps = this.room.find(FIND_MY_CREEPS);
	for(var n in creeps) {
		var c = this.creepFactory.load(creeps[n]);
		if(c) {
			this.creeps.push(c);
		}
	}
	this.distributeBuilders();
	this.distributeResources('CreepMiner');
	this.distributeResources('CreepCarrier');
	this.distributeCarriers();
};
Room.prototype.distributeBuilders = function() {
	var builderStats = this.population.getType('CreepBuilder');
	if(this.depositManager.spawns.length == 0) {
		for(var i = 0; i < this.creeps.length; i++) {
			var creep = this.creeps[i];
			if(creep.remember('role') != 'CreepBuilder') {
				continue;
			}

			creep.remember('forceControllerUpgrade', false);
		}
		return;
	}
	if(builderStats <= 3) {
		for(var i = 0; i < this.creeps.length; i++) {
			var creep = this.creeps[i];
			if(creep.remember('role') != 'CreepBuilder') {
				continue;
			}
			creep.remember('forceControllerUpgrade', false);
		}
	} else {
		var c = 0;
		for(var i = 0; i < this.creeps.length; i++) {
			var creep = this.creeps[i];
			if(creep.remember('role') != 'CreepBuilder') {
				continue;
			}
			creep.remember('forceControllerUpgrade', false);
			c++;
			if(c == 1) {
				break;
			}
		}
	}
}
Room.prototype.distributeCarriers = function() {
	var counter = 0;
	var builders = [];
	var carriers = [];
	for(var i = 0; i < this.creeps.length; i++) {
		var creep = this.creeps[i];
		if(creep.remember('role') == 'CreepBuilder') {
			builders.push(creep.creep);
		}
		if(creep.remember('role') != 'CreepCarrier') {
			continue;
		}
		carriers.push(creep);
		if(counter%3) {
			// Population
			creep.setDepositFor(2);
		} else {
			// Construction
			creep.setDepositFor(1);
		}

		counter++;
	}
	counter = 0;
	for(var i = 0; i < carriers.length; i++) {
		var creep = carriers[i];
		if(creep.remember('role') != 'CreepCarrier') {
			continue;
		}
		if(!builders[counter]) {
			continue;
		}
		var id = creep.remember('target-worker');
		if(!Game.getObjectById(id)) {
			creep.remember('target-worker', builders[counter].id);
		}
		counter++;
		if(counter >= builders.length) {
			counter = 0;
		}
	}
};

Room.prototype.distributeResources = function(type) {
	var sources = this.resourceManager.getSources();
	var perSource = Math.ceil(this.population.getType(type).total/sources.length);
	var counter = 0;
	var source = 0;

	var limits = [];
	for (let i in sources) {
		limits[sources[i]] = 0;
		let tmp = sources[i].pos;
		for (let x = -1; x < 2; ++x) {
			for (let y = -1; y < 2; ++y) {
				if (x == 0 && y == 0)
					continue;
				if (Game.map.getTerrainAt(tmp.x+x, tmp.y+y, tmp.roomName) != 'wall') {
					++limits[sources[i]];
				}
			}
		}
	}

	for(var i = 0; i < this.creeps.length; i++) {
		var creep = this.creeps[i];
		if(creep.remember('role') != type) {
			continue;
		}

		if (!limits[sources[source]]) {
			continue;
		}

		creep.remember('source', sources[source].id);
		if (--limits[sources[source]] == 0) {
			++source;
		}
	}
};

require('screeps-profiler').registerObject(Room, 'Room');

module.exports = Room;
