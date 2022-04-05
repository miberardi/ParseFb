const ParseFbAlbum =  require('./ParseFbAlbum.js')

// config
const debug = false;
const prefix = "newyorkold";
const albums = [
'https://www.facebook.com/media/set/?set=a.194507143983627&type=3',
'https://www.facebook.com/media/set/?set=a.229651727135835&type=3',
'https://www.facebook.com/media/set/?set=a.217664661667875&type=3',
'https://www.facebook.com/media/set/?set=a.138488816252127&type=3',
'https://www.facebook.com/media/set/?set=a.418171991617140&type=3',
'https://www.facebook.com/media/set/?set=a.138973129537029&type=3',
'https://www.facebook.com/media/set/?set=a.218926944874980&type=3',
'https://www.facebook.com/media/set/?set=a.430094477091558&type=3',
'https://www.facebook.com/media/set/?set=a.218926658208342&type=3',
'https://www.facebook.com/media/set/?set=a.216405328460475&type=3',
'https://www.facebook.com/media/set/?set=a.138832326217776&type=3',
'https://www.facebook.com/media/set/?set=a.206654306102244&type=3',
'https://www.facebook.com/media/set/?set=a.218927354874939&type=3',
'https://www.facebook.com/media/set/?set=a.139756959458646&type=3',
'https://www.facebook.com/media/set/?set=a.1212550535512611&type=3',
'https://www.facebook.com/media/set/?set=a.216605138440494&type=3',
'https://www.facebook.com/media/set/?set=a.2716394805128169&type=3',
'https://www.facebook.com/media/set/?set=a.138588546242154&type=3'
]

parseFbAlbum = new ParseFbAlbum(prefix, albums, debug);
parseFbAlbum.start();

