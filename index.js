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
    {'key' : 1,  'value' : 'presidente'         },
    {'key' : 2,  'value' : 'vice-presidente'    },
    {'key' : 3,  'value' : 'governador'         },
    {'key' : 4,  'value' : 'vice-governador'    },
    {'key' : 5,  'value' : 'senador'            },
    {'key' : 6,  'value' : 'deputado-federal'   },
    {'key' : 7,  'value' : 'deputado-estadual'  },
    {'key' : 8,  'value' : 'deputado-distrital' },
    {'key' : 9,  'value' : 'senador-1-suplente' },
    {'key' : 10, 'value' : 'senador-2-suplente' }
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
        bar          = new ProgressBar('Searching states :bar', { total: total_states });

    _.each(Import.states, function (uf, idx, l) {
      bar.tick();
      _.each(Import.roles, function (cargo) {
        var url = '/divulga-cand-2014/eleicao/2014/UF/'+uf.key+'/candidatos/cargo/'+cargo.key;
        Import.call(url,
          function (err, response, body) {
        console.log(url);
            if (err) {
              deferred.reject(err);
              throw err;
            }

            var $ = cheerio.load(body);
            $('#tbl-candidatos tbody tr td a').each(function(i, el) {
              candidates.push({'cand_id':el.attribs.id.slice(5),'href':el.attribs.href});
            });
            if (parseInt(idx) === parseInt(total_states)) {
              Import.candidates = candidates;
              deferred.resolve(Import);
            }
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
      bar          = new ProgressBar('Searching candidates :bar', { total: total_candidates });

    _.each(Import.candidates, function (profile, idx) {
      Import.call(profile.href,
        function (err, response, body) {
          console.log(profile.href);
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

            var candidate = new CandidateModel();
            candidate = _.extend(candidate, profile);

            // save the bear and check for errors
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

// Q.fcall(Import.read_profile)
Q.fcall(Import.search_states)
  .then(Import.search_candidates)
  .then(Import.read_profile)
  .catch(function (error) {
      console.error(error);
  })
  .then(function (result) {
    console.log(result);
    // var total_candidates = _.size(result.candidates)-1;
    // var bar = new ProgressBar('Saving candidates :bar', { total: total_candidates });

    // _.each(result.candidates, function(vv) {
    //   var candidate = new CandidateModel();
    //   candidate = _.extend(candidate, vv);

    //   // save the bear and check for errors
    //   candidate.save(function(err) {
    //     if (err) {
    //         console.error(err);
    //     }
    //   });
    // });
  });



