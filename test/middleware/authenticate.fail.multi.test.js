var chai = require('chai')
  , authenticate = require('../../lib/passport/middleware/authenticate')
  , Passport = require('../..').Passport;


describe('middleware/authenticate', function() {
  
  describe('with multiple strategies, all of which fail, and responding with unauthorized status', function() {
    function BasicStrategy() {
    }
    BasicStrategy.prototype.authenticate = function(req) {
      this.fail('BASIC challenge');
    }
    
    function DigestStrategy() {
    }
    DigestStrategy.prototype.authenticate = function(req) {
      this.fail('DIGEST challenge');
    }
    
    function NoChallengeStrategy() {
    }
    NoChallengeStrategy.prototype.authenticate = function(req) {
      this.fail();
    }
    
    var passport = new Passport();
    passport.use('basic', new BasicStrategy());
    passport.use('digest', new DigestStrategy());
    passport.use('no-challenge', new NoChallengeStrategy());
    
    var request, response;

    before(function(done) {
      chai.connect.use(authenticate(['basic', 'no-challenge', 'digest']).bind(passport))
        .req(function(req) {
          request = req;
          
          req.flash = function(type, msg) {
            this.message = { type: type, msg: msg }
          }
        })
        .end(function(res) {
          response = res;
          done();
        })
        .dispatch();
    });
    
    it('should not set user', function() {
      expect(request.user).to.be.undefined;
    });
  
    it('should respond', function() {
      expect(response.statusCode).to.equal(401);
      expect(response.body).to.equal('Unauthorized');
    });
    
    it('should set authenticate header on response', function() {
      var val = response.getHeader('WWW-Authenticate');
      expect(val).to.be.an('array');
      expect(val).to.have.length(2);
      
      expect(val[0]).to.equal('BASIC challenge');
      expect(val[1]).to.equal('DIGEST challenge');
    });
  });
  
  describe('with multiple strategies, all of which fail, and flashing message', function() {
    function StrategyA() {
    }
    StrategyA.prototype.authenticate = function(req) {
      this.fail('A message');
    }
    
    function StrategyB() {
    }
    StrategyB.prototype.authenticate = function(req) {
      this.fail('B message');
    }
    
    var passport = new Passport();
    passport.use('a', new StrategyA());
    passport.use('b', new StrategyB());
    
    var request, response;

    before(function(done) {
      chai.connect.use('express', authenticate(['a', 'b'], { failureFlash: true,
                                                             failureRedirect: 'http://www.example.com/login' }).bind(passport))
        .req(function(req) {
          request = req;
          
          req.flash = function(type, msg) {
            this.message = { type: type, msg: msg }
          }
        })
        .end(function(res) {
          response = res;
          done();
        })
        .dispatch();
    });
    
    it('should not set user', function() {
      expect(request.user).to.be.undefined;
    });
    
    it('should flash message', function() {
      expect(request.message.type).to.equal('error');
      expect(request.message.msg).to.equal('A message');
    });
  
    it('should redirect', function() {
      expect(response.statusCode).to.equal(302);
      expect(response.getHeader('Location')).to.equal('http://www.example.com/login');
    });
  });
  
});
