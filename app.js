"use strict";
var App = function(){};
App.prototype = {
	init: function() {
		this.express = require('express');
		this.app = this.express();
		this.http = require('http');
		this.path = require('path');
		this.server = this.http.createServer(this.app);
		this.io = require('socket.io').listen(this.server);
		this.json = require('./qte.json');
		this.listenQTE = 0;
		this.listenPassIntro = 0;
		this.rooms = {};
        this.MovieDB = require('moviedb')('d4a1a9b06621591c22dc52f5bb5c1598');

		this.app.use(this.express.static(this.path.join(__dirname, './assets/mobile/views/')));
		this.app.use(this.express.static(this.path.join(__dirname, './assets/desktop/views')));
		this.app.use(this.express.static(this.path.join(__dirname, './assets/desktop/videos/')));
		this.app.use(this.express.static(this.path.join(__dirname, './assets/')));
		this.getRoutes();
		this.socketListener();
	},
	getRoutes: function() {
		var self = this
		// Routing with params
		self.app.get('/', function (req, res) {
		  res.render('index.ejs', {title: 'Wind Memory'});
		}).get('/:code/', function (req, res) {
		  res.render('mobile.ejs', {title: 'Wind Memory', code: req.params.code});
		});
	},
	isInArray: function(value, array) {
		return array.indexOf(value) > -1;
	},
	socketListener: function() {
		var self = this;

		self.io.sockets.on('connection', function(socket){
			socket.on('subscribe', function(room) {
				if(self.rooms[room] === undefined) {
					self.rooms[room] = {count: 1, clients: []};
					socket.join(room);
				}
				else self.io.to(socket.id).emit('changeRoom');
			});

			socket.on('subscribeMobile', function(room) {
				if(self.rooms[room]) {
					if(self.rooms[room].count < 2) {
						self.rooms[room].count++;
						self.rooms[room].clients.push(socket.id);
						socket.join(room);
						self.io.to(room).emit('askStep');
					} else {
						self.io.to(socket.id).emit('noMoreSpaces');
					}
				}
			});

			socket.on('resStep', function(datas) {
				self.io.to(datas.room).emit('resStep', datas.step);
			});

			socket.on('askFilmName', function(datas){
				self.io.to(datas.room).emit('askFilmName');
			});

			socket.on('resFilmName', function(datas) {
				self.io.to(datas.room).emit('resFilmName', datas.filmName);
			});

			socket.on('mobileConnection', function(datas){
				self.io.to(datas.room).emit('mobileConnected', self.json);
			});

			socket.on('passIntro', function(datas){
				self.io.to(datas.room).emit('passIntro', datas.filmName);
				self.listenPassIntro = 1;
			});

			socket.on('mobilePassIntro', function(datas){
				if(self.listenPassIntro) {
					self.listenPassIntro = 0;
					self.io.to(datas.room).emit('mobilePassIntro');
				}
			});

			socket.on('actionQTE', function(datas){
				self.io.to(datas.room).emit('mobileActionQTE', datas.action);
				self.listenQTE = 1;
			});

			socket.on('mobileResponseQTE', function(datas) {
				if(self.listenQTE) {
					self.io.to(datas.room).emit('QTEDone', datas.action);
				}
				self.listenQTE = 0;
			});

			socket.on('introPassed', function(room) {
				self.listenPassIntro = 0;
			});

			socket.on('failQTE', function(room) {
				self.listenQTE = 0;
				self.io.to(room).emit('failQTE');
			});

			socket.on('successQTE', function(room) {
				self.listenQTE = 0;
				self.io.to(room).emit('successQTE');
			});

			socket.on('loadingInProgress', function(datas){
				self.io.to(datas.room).emit('loadingInProgress', datas.load);
			});

			socket.on('renderMap', function(room){
				self.io.to(room).emit('renderMap');
			});

			socket.on('renderOnFilm', function(datas){
				self.io.to(datas.room).emit('renderOnFilm', datas.filmName);
			});

			socket.on('renderOnSequence', function(datas){
				self.io.to(datas.room).emit('renderOnSequence', datas.filmName);
			});

			socket.on('disconnect', function(){
				for(var i in self.rooms) {
					var room = self.rooms[i].clients;
					if(self.isInArray(socket.id, room))	self.rooms[i].count--;
				}
			});

            socket.on('askFilm', function(datas){
                self.MovieDB.movieInfo({id: 81}, function(err, res){
                    self.io.to(datas.room).emit('responseFilm', res);
                });
            });
		});
		self.server.listen(40000);
	},
    /* https://github.com/danzajdband/moviedb/ */
    getFilmInfo: function(idFilm){
        this.MovieDB.movieInfo({id: 81}, function(err, res){
			return res;
        });
    }
}
var app = new App();
app.init();

