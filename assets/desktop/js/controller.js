"use strict";

var Controller = function() {};
Controller.prototype = {
	init: function(model, view) {
		this.socket = io.connect();
		this.model = model;
		this.view = view;
		this.model.init(this.socket);
		this.videoNumber = 0;
		this.room = 0;
		this.main = document.querySelector('.main');
		this.eventListener();
		this.socketListener();
	},
	eventListener: function(){
		var self= this;
		
		document.querySelector('.fullscreen-toggle').addEventListener('click', self.view.toggleFullscreen, false);
	},
	socketListener: function() {
		var self = this;
		this.socket.on('connect', function() {
			self.model.ajaxLoadTemplate('links.handlebars',function(template){
				self.view.initTemplates('linksTemplate', template, function(){
					self.model.createRoom(function(string){
						self.model.getRootUrl(function(rootUrl) {
							self.view.showAccess(string, rootUrl);
							self.room = string;
						});
					});
				});
			});
		});

		this.socket.on('mobileConnected',function(data){
			self.json = data;
			self.loadVideoTemplates();
		});
	},
	loadVideoTemplates: function(){
		var self = this;
		self.load = 0;
		self.numberOfLoad = 7;
		self.launchInitTemplate('video.handlebars', 'videoTemplate');
		self.launchInitTemplate('quote.handlebars', 'quoteTemplate');
		self.launchInitTemplate('movieHome.handlebars', 'movieHomeTemplate');
		self.launchInitPartials('logos/nausicaa.handlebars', 'nausicaaLogo');
		self.launchInitPartials('modules/sound.handlebars', 'sound');
		self.launchInitPartials('modules/credits.handlebars', 'credits');
		self.launchInitTemplate('moviePlaying.handlebars', 'moviePlaying');
	},
	launchInitTemplate: function(templatePath, templateName){
		var self = this;
		self.model.ajaxLoadTemplate(templatePath, function(template) {
			self.view.initTemplates(templateName, template, function(){
                self.dealWithLoading();
			});
		});
	},
	launchInitPartials: function(partielPath, partialName){
		var self = this;
		self.model.ajaxLoadTemplate(partielPath, function(template) {
			Handlebars.registerPartial(partialName, template);
			self.dealWithLoading();
		});
	},
	dealWithLoading: function(){
		this.load += 100/this.numberOfLoad;
		if(Math.round(this.load) === 100) this.rollIntro();
	},
	rollIntro: function() {
		var self = this;
		self.view.renderIntro(self.json[self.videoNumber], function(video){
			self.main.classList.add('hide-element');
			video.play();
			video.onended = function(){self.passIntro();};
			self.model.emitSocket('passIntro', self.room);
			self.addIntroListener();
		});
	},
	
	passIntro: function() {
		var self = this;
		
		this.view.renderHomeVideo(this.json[this.videoNumber], function(){
			console.log('home');
			document.querySelector('.new-game').addEventListener('click', self.newGame.bind(self), false);
		});
	},
	
	addIntroListener: function() {
		var self = this;
		self.socket.on('mobilePassIntro', function(){
			self.passIntro();
		});
	},
	
	newGame: function(e){
		e.preventDefault();
		this.videoSequence = 0;
		this.dealSequences();
	},
	
	dealSequences: function(){
		var self = this;
		self.view.renderQuotes(self.json[self.videoNumber], self.videoSequence, function(){
			self.view.renderVideo(self.json[self.videoNumber], self.videoSequence, function() {
				self.video = document.querySelector('.video');
				self.video.load();
				self.addVideoListener();
			});
		});
		
	},
	
	fadeQuotesAndLaunchVideo: function(){
		var self = this;
		setTimeout(function(){
			self.main.classList.add('hide-element');
			self.view.launchVideo(self.video);
		},3000);
		
	},
	
	addVideoListener: function() {
		var self = this;
		var i = 0;
		self.video.addEventListener('canplaythrough', function(){self.fadeQuotesAndLaunchVideo();} , false);
		var sequence = self.json[self.videoNumber].sequences[self.videoSequence];
		if(sequence.qte.length) {
			var interval = setInterval(function(){			
				if(parseInt(self.video.currentTime) === parseInt(sequence.qte[i].time)) {
					self.dealQTEAction(parseInt(sequence.qte[i].duration)*1000, sequence.qte[i].type);
					if(i < sequence.qte.length-1) i++;
				}
			},1000);
		}
		self.video.onended = function(e) { self.finishVideo(interval) };
	},
	
	dealQTEAction: function(wait, action) {
		var self = this;
		self.view.displayQTEInformations(action, function() {
			var datas = {'action': action, 'room': self.room};
			self.model.emitSocket('actionQTE', datas, function() {
				var timeout = setTimeout(function(){
					self.model.emitSocket('failQTE');
					console.log('failQTE');
                    self.view.toggleQteMode();
				}, wait);
				self.addQTEListener(timeout, action);
			});
		});
		
	},
	
	addQTEListener: function(timeout, action) {
		var self = this;
		
		this.socket.on('QTEDone', function(actionMobile) {
			if(action === actionMobile) {
				clearTimeout(timeout);
				console.log('Même action');
                self.view.toggleQteMode();
			} else {
				self.model.emitSocket('failQTE');
			}
		});
	},
	
	finishVideo: function(interval) {
		clearInterval(interval);
		if(this.videoSequence < this.json[this.videoNumber].sequences.length-1) {
			this.videoSequence++;
			this.dealSequences();
		}
	}
};
