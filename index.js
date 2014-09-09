var request = require('request')
  , cheerio = require('cheerio')
  , Q       = require('q')
  , _       = require('underscore');

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

  base_url : 'http://divulgacand2014.tse.jus.br/divulga-cand-2014',

  call : function(path, callback) {
    var url = Import.base_url + path;
    request(url, callback);
  },

  search_states : function() {
    var deferred = Q.defer(),
      states = [];

    Import.call('/menu/2014',
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
        candidates = [];

    _.each(Import.states, function (uf, idx, l) {
      _.each(Import.roles, function (cargo) {
        var url = '/eleicao/2014/UF/'+uf.key+'/candidatos/cargo/'+cargo.key;
        Import.call(url,
          function (err, response, body) {

            if (err) {
              deferred.reject(err);
              throw err;
            }

            var $ = cheerio.load(body);
            $('#tbl-candidatos tbody tr td a').each(function(i, el) {
              candidates.push({'id':el.attribs.id.slice(5),'href':el.attribs.href});
            });
            // console.log(candidates);

            if ((parseInt(idx) === parseInt(total_states)) && (cargo.key == 10)) {
              Import.candidates = candidates;
              deferred.resolve(Import);
            }
        });
      });
    });

    return deferred.promise;
  }
}

Q.fcall(Import.search_states)
  .then(Import.search_candidates)
  .then(function (result) {
      console.log(result.states);
      console.log(result.candidates);
  })
  .catch(function (error) {
      console.error(error);
  })
  .done();