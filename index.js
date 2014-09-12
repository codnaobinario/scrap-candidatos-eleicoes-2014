var request     = require('request')
  , cheerio     = require('cheerio')
  , Q           = require('q')
  , _           = require('underscore')
  , ProgressBar = require('progress')

  , db             = require('./db')
  , CandidateModel = require('./model/Candidate');


var Import = {

  states : new Array,

  candidates : new Array,

  roles : new Array(
    {'key' : 1,  'value' : 'Presidente'         },
    {'key' : 2,  'value' : 'Vice-Presidente'    },
    {'key' : 3,  'value' : 'Governador'         },
    {'key' : 4,  'value' : 'Vice-Governador'    },
    {'key' : 5,  'value' : 'Senador'            },
    {'key' : 6,  'value' : 'Deputado Federal'   },
    {'key' : 7,  'value' : 'Deputado Estadual'  },
    {'key' : 8,  'value' : 'Deputado Distrital' },
    {'key' : 9,  'value' : 'Senador 1º suplente' },
    {'key' : 10, 'value' : 'Senador 2º suplente' }
  ),

  base_url : 'http://divulgacand2014.tse.jus.br',

  call : function(path, callback) {
    var url = Import.base_url + path;
    request(url, callback);
  },

  search_states : function() {
    var deferred = Q.defer(),
      states = [];

    Import.call('/divulga-cand-2014/menu/2014',
      function (err, response, body) {
        if (err) {
          deferred.reject(err);
          throw err;
        }

        var $ = cheerio.load(body);

        $('.btn-sm').each(function(i, el) {
          states.push({'key':el.attribs.title,'href':el.attribs.href});
        });
        Import.states = states;
        deferred.resolve(Import);
      }
    );

    return deferred.promise;
  },

  search_candidates : function() {
    var deferred     = Q.defer(),
        total_states = _.size(Import.states)-1,
        candidates   = new Array,
        bar          = new ProgressBar('Procurando candidatos por estado e cargo [:bar] :percent :etas', { total: total_states*Import.roles.length });

    _.each(Import.states, function (uf, idx, l) {
      _.each(Import.roles, function (cargo) {
        var url = '/divulga-cand-2014/eleicao/2014/UF/'+uf.key+'/candidatos/cargo/'+cargo.key;
        Import.call(url,
          function (err, response, body) {
            //console.log('Lendo candidatos de '+uf.key+', cargo '+cargo.value);
            if (err) {
              deferred.reject(err);
              throw err;
            }

            var $ = cheerio.load(body);
            $('#tbl-candidatos tbody tr td a').each(function(i, el) {
              candidates.push({'cargo':cargo.value, 'cand_id':el.attribs.id.slice(5),'href':el.attribs.href});
            });
            if (parseInt(idx) === parseInt(total_states)) {
              Import.candidates = candidates;
              deferred.resolve(Import);
            }
            bar.tick();
        });
      });
    });

    return deferred.promise;
  },

  parseDate : function (input) {
    var parts = input.split('/');
    // new Date(year, month [, day [, hours[, minutes[, seconds[, ms]]]]])
    return new Date(parts[2], parts[1]-1, parts[0]); // Note: months are 0-based
  },

  read_profile : function () {
    var deferred = Q.defer(),
      total_candidates = _.size(Import.candidates)-1,
      bar          = new ProgressBar('Lendo e gravando o candidato [:bar] :percent :etas', { total: total_candidates });

    _.each(Import.candidates, function (profile, idx) {
      Import.call(profile.href,
        function (err, response, body) {
          if (err) {
            deferred.reject(err);
            throw err;
          }

          var $       = cheerio.load(body);

          profile.image           = Import.base_url + $('.foto-candidato').attr('src');

          profile.nome_urna       = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(1) > td:nth-child(2)').text();
          profile.nome_completo   = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(2) > td:nth-child(2)').text();
          profile.data_nascimento = Import.parseDate($('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(3) > td:nth-child(2)').text());
          profile.raca            = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(4) > td:nth-child(2)').text();
          profile.nacionalidade   = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(5) > td:nth-child(2)').text();
          profile.grau_instrucao  = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(6) > td:nth-child(2)').text();
          profile.partido         = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(7) > td:nth-child(2)').text();
          profile.nome_coligacao  = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(8) > td:nth-child(2)').text();
          profile.coligacao       = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(9) > td:nth-child(2)').text();
          profile.numero_processo = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(10) > td:nth-child(2)').text();
          profile.cpnj            = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(11) > td:nth-child(2)').text();

          profile.numero          = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(1) > td:nth-child(4)').text();
          profile.sexo            = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(2) > td:nth-child(4)').text();
          profile.estado_civil    = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(3) > td:nth-child(4)').text();
          profile.naturalidade    = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(5) > td:nth-child(4)').text();
          profile.ocupacao        = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(6) > td:nth-child(4)').text();
          profile.numero_protocolo = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(10) > td:nth-child(4)').text();
          profile.limite_gastos   = $('body > div.container > div.col-md-10 > table > tbody > tr:nth-child(11) > td:nth-child(4)').text();

          //console.log('Gravando candidato de '+profile.naturalidade+' nome:'+profile.nome_urna);

          var candidate = new CandidateModel();
          candidate = _.extend(candidate, profile);

          candidate.save(function(err) {
          if (err) {
              console.error(err);
          }
        });
        if (parseInt(idx) === parseInt(total_candidates)) {
          deferred.resolve(Import.candidates);
        }
        bar.tick();
      });

      return deferred.promise;
    });
  }
}

Q.fcall(Import.search_states)
  .then(Import.search_candidates)
  .then(Import.read_profile)
  .catch(function (error) {
    if (error) {
      console.error(error);
    }
  })
  .then(function (result) {
    // process.kill()
  });
