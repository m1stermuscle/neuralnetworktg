const TelegramBot = require('node-telegram-bot-api');
const token = '5332414219:AAGX6hbLeCWJZQgqD56TEogsC7DLX8p3J9Y';
const bot = new TelegramBot(token, {polling: true});
const fs = require('fs');
const spawner = require('child_process').spawn;
const {spawn} = require('child_process');
const {pathToFileURL} = require('url');
const {cpuUsage} = require('process');

const commands = {
    '/start': msg => {
        bot.sendMessage(msg.chat.id, 'Привет! Я - бот Clothes, который поможет тебе найту похожую одежду по твоей фотографии, а также расскажет много интересного о моде.', {
            "reply_markup": {
                "keyboard": [
                    ["Поиск по фото", "Как это работает?"],
                    ["Факт", "Тренды"]
                ]
            }
        });

    },

    'Тренды': msg => {
        const resp = 'Какой тренд тебя интересует?';
        bot.sendMessage(msg.chat.id, resp, {
            "reply_markup": {
                "keyboard": [
                    ["Кроссовки", "Экологичность"],
                    ["Ugly fashion", "Джинса"],
                    ["Монохром", "Нулевые"],
                    ["Спортивный стиль"],
                    ["Вернуться назад"]
                ]
            }
        });
    },

    'Как это работает?': msg => {
        const resp = 'Наш бот принимает изображение, после чего передаёт его нейросети, которая обучена распознавать вещи на картинках. После обработки фотографии, бот найдёт похожие вещи в нашей базе данных и покажет их вам.';
        bot.sendMessage(msg.chat.id, resp);
    },

    'Вернуться назад': msg => {
        bot.sendMessage(msg.chat.id, 'Меню', {
            "reply_markup": {
                "keyboard": [
                    ["Поиск по фото", "Как это работает?"],
                    ["Факт", "Тренды"]
                ]
            }
        });
    },

    'Факт': async msg => {
        if (!(msg.chat.id in factsReplies)) factsReplies[msg.chat.id] = [cloneArray(factsTexts),
            cloneArray(factsImageLinks)
        ];
        let texts = factsReplies[msg.chat.id][0];
        let imageLinks = factsReplies[msg.chat.id][1];

        function select(arr1, arr2) {
            if (arr1.length == 0) return 'На сегодня это все факты :)';
            else {
                if (arr1.length != arr2.length) return console.log(`Lengths don't match`);

                index = Math.floor(Math.random() * arr1.length);
                let item1 = arr1[index];
                let item2 = arr2[index];
                arr1.splice(index, 1);
                arr2.splice(index, 1);

                return [item1, item2];
            };
        };

        resp = select(texts, imageLinks);
        if (Array.isArray(resp)) {
            await (bot.sendPhoto(msg.chat.id, resp[1]));
            bot.sendMessage(msg.chat.id, resp[0]);
        } else {
            bot.sendMessage(msg.chat.id, resp);
        };
    },

    'Поиск по фото': msg => {
        let searchOn = true;
        const resp = 'Чтобы продолжить, отправь картику с интересующей вещью';
        bot.sendMessage(msg.chat.id, resp, {
            "reply_markup": {
                "keyboard": [
                    ["Вернуться назад"]
                ]
            }
        });

        bot.on('photo', async msg => {
            if (!searchOn) return;
            let files = fs.readdirSync('images');

            for (let file of files) {
                fileId = file.substring(5, file.length - 4);
                fs.unlinkSync('images/file_' + fileId + '.jpg');
            };

            fileId = msg.photo[msg.photo.length - 1].file_id;
            await (bot.downloadFile(fileId, 'images'));
            const imageDir = 'images/' + fs.readdirSync('images');

            const pythonProcess = spawner('python', ['neuralnetwork.py', imageDir]);
            pythonProcess.stdout.on('data', async data => {
                let pythonOutput = data.toString().substring(2, data.length - 4);
                if (pythonOutput == '') return bot.sendMessage(msg.chat.id, 'Фото не удалось распознать');
                if (pythonOutput.lastIndexOf('https://www') == 0) {
                    pythonOutput = pythonOutput.split(',');
                } else {
                    pythonOutput = pythonOutput.split(`'\r\n '`);
                };

                await (bot.sendMessage(msg.chat.id, 'Вот похожие вещи, которые нам удалось найти'));
                for (let i = 0; i < pythonOutput.length; i++) {
                    await (bot.sendMessage(msg.chat.id, pythonOutput[i]));
                    bot.sendPhoto(msg.chat.id, pythonOutput[i]);
                }
            })
        });

        bot.onText(/Вернуться назад/, () => {
            searchOn = false;
        });
    }
};

const factsReplies = {};
const factsTexts = [`«Мясное платье» — наряд американской певицы Леди Гага кровавого цвета, в котором она появилась на 27-й церемонии музыкальных наград MTV Video Music Awards 2010. Платье было создано дизайнером одежды Франком Фернандесом и похоже на «Мясное бикини», в котором Леди Гага снялась для обложки Vogue Hommes Japan.`,
    `Michael Kors создал свой первый предмет одежды в возрасте пяти лет — свадебное платье для своей матери.`,
    `Более 2 млрд футболок продаются каждый год. Изначально, футболки являлись элементом нижнего белья. Но теперь, футболка — популярный предмет гардероба в качестве верхней одежды.`,
    `До 1800-х годов не было понятия детской одежды. Дети одевались так же, как взрослые.`,
    `Бикини названы в честь острова, атолла Бикини, где американские военные тестировали свои бомбы в Первой мировой войне. Их создатель, Луи Реар, верил , что костюм «мини» своим появлением создаст эффект атомной бомбы , из-за номинальных размеров одежды.`,
    `Носить публично шорты считалось не приемлемым для женщин, вплоть до Первой мировой войны.`,
    `Винтажные вещи – это предметы гардероба, произведенные в период с 1920-х по 1960-е годы, а все, что создавалось позже следует называть «ретро».`,
    `Почему сланцы так называются? Оказывается, советские резиновые шлепанцы производили в городе Сланцы. Название города было выдавлено на подошве, что давало повод думать, что это название «тапочек».`,
    `Солнцезащитные очки стали особенно популярными благодаря кинозвездам Голливуда, которые  надевали темные очки, чтобы защитить глаза от сияния софитов, а потом, чтобы скрыть лицо от поклонников.`,
    `До эпохи промышленного производства никаких стрелок не было. А с развитием фабричного пошива во второй половине 19 века появилась необходимость транспортировки больших партий товара, чаще всего морским транспортом. После распаковки штаны имели плохо поддающиеся разглаживанию стрелки-складки, и такой вариант постепенно вошел в моду.`,
    `Спортивный стиль одежды прочно вошел в нашу жизнь. Считается, что спортивная одежда для женщин появилась благодаря Коко Шанель, только в начале прошлого столетия. Но это является заблуждением. Необходимость удобной одежды для верховой езды подвигло "кутерье" 18 века на создание костюма-амазонки, включающего в себя: жакет, блузку и длинную клиновидную юбку. Именно в таких костюмах знатные дворянки совершали променад верхом на лошадях.`,
    `Одним из самых популярнейших видов тканей в начале 19 века считался индийский муслин. Шали из этой ткани с принтом в виде "турецкого огурца" считала обязанным иметь в своем гардеробе каждая женщина, мало-мальски претендующая на титул "модница". Одержимость "огурцами" высмеяла в своем романе "Нортенгерское аббатство" Джейн Остин, указав на то, что влюбленным мужчинам совершенно безразлично, присутствуют ли в наряде дамы пресловутый турецкий огурец или нет.`,
    `Плащи и куртки аналогичного им покроя были разработаны в качестве формы для военных в период до Второй мировой войны. Но благодаря «Burberry» и «Yves Saint Laurent» этот изначально мужской наряд появился в женском гардеробе.`,
    `Липучку изобрел швейцарский инженер Джордж де Местраль в 1941 году. После прогулки в Альпах со своими собаками инженер, пораженный тем, как крепко колючки репейника пристали к его одежде и собачьей шерсти, решил исследовать механизм их крепления. Когда он стал изучать колючки под микроскопом , то обнаружил сотни крючков, способных прилипать к любому волокну. Разработка липучки заняла у него около 10 лет. Удобство новой застежки быстро сделало ее очень востребованной.`,
    `История происхождения этих тяжелых ботинок на шнуровке очень некрасивая. Их изготавливали для немецких солдат во время Второй мировой войны, и они являлись символом нацистов. Однако в послевоенные годы эти ботинки стали одним из атрибутов панков и других альтернативных молодежных течений, в результате чего с течением времени мрачное впечатление от этих ботинок стерлось, и теперь это один из любимых предметов современной обуви.`,
    `Спортивная обувь , которую производили для большого тенниса в XIX веке, была представлена как «теннисные туфли». Поскольку каучук, из которого они изготавливаются, весьма дорогой материал, то эта обувь, которую мог носить только высший класс, вскоре превратилась в символ статуса, и остается этим символом и по сей день.`,
    `Сейчас под манекеном понимается кукла в рост человека для демонстрации одежды. Но до 19-го столетия манекеном называли маленькие деревянные фигурки, одетые в копии реальной одежды. Портнихи даже посылали эти деревянные куклы своим уделенным заказчикам для демонстрации платьев вместо рисунков.`,
    `Основатели двух компаний по производству спортивной обуви всю жизнь жестоко враждовали. При этом они были братьями! Адольф и Рудольф Дасслеры изначально открыли совместно обувную фабрику. Но вскоре серьезно разругались из-за различных политических взглядов.`,
    `Кто бы мог подумать, но если бы не Наполеон Бонапарт, то в современной одежде возможно и не существовало бы пуговиц! Ведь именно он ввел их в обиход, чтобы отучить своих солдат он назойливой привычки вытирать носы рукавами.`,
    `Появление самого первого настоящего журнала мод датировано 1586 годом, а публиковать его начали в Германии. И на страницах данного журнала можно было увидеть практически все то же самое, что мы сейчас видим в большинстве современных модных журналов!`,
    `Первой компанией, создавшей кроссовки, стала компания Keds, а произошло это в 1917 г. Самой же первой обувью человека, если верить историческим фактам, стали сандалии.`
];
const factsImageLinks = [`https://assets.vogue.ru/photos/60a96d5c866ac4d774cb66d4/2:3/w_2560%2Cc_limit/ALM2DH1KCM.jpg`,
    `https://assets.vogue.com/photos/607884e021f57e4bfcc0031c/master/w_1600%2Cc_limit/michael-kors-image004.jpg`,
    `https://image.made-in-china.com/2f0j00gpLRHTArqFkt/Custom-T-Shirts-100-Cotton-Men-Tshirt-Tee-Shirt-Printing-T-Shirt-Polo-T-Shirt-for-Men-Women-Plain-T-Shirt.jpg`,
    `https://acoolakids.ru/upload-files/blog/winterhalter.jpg`,
    `https://i.pinimg.com/736x/34/92/ea/3492ea7877b1662e7f66b17dc175aa4f.jpg`,
    `https://static.lichi.com/product/43400/925becca8d1d0829d4fef18c6c139220.jpg?v=0_43400.0&resize=size-middle`,
    `https://www.shoppingschool.ru/netcat_files/userfiles/Articles/2019/vintage/1.jpg`,
    `https://img.brandshop.ru/cache/products/s/slantsi-adidas-originals-yeezy-slide-bone-bone-bone-1_1104x1104.jpg`,
    `https://iledebeaute.ru/files/images/pub/part_3/73065/src/%D0%BE%D1%87%D0%BA%D0%B8.jpg?600_793`,
    `http://www.in-image.ru/images/stories/Alex/strelki-na-brukah.jpg`,
    `https://billionnews.ru/uploads/posts/2020-11/1605079576_1.jpg`,
    `https://billionnews.ru/uploads/posts/2020-11/1605079545_7.jpg`,
    `https://1gai.ru/uploads/posts/2020-12/1607345439_3.jpg`,
    `https://www.mikspb.ru/custom/uploads/photoalbums/404/full/6.jpg`,
    `https://1gai.ru/uploads/posts/2020-12/1607346080_5.jpg`,
    `https://1gai.ru/uploads/posts/2020-12/1607346068_6.jpg`,
    `https://glem.com.ua/img/4921/365.jpg`,
    `https://idealsport.com.ua/content/uploads/images/3131b35d-8ef9-4bd3-8e56-74e81d6c5462.jpeg`,
    `https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Napoleon_in_1806.PNG/640px-Napoleon_in_1806.PNG`,
    `https://condenast-media.gcdn.co/vogue/eac1e94d4c40997fbd5f774eb259f493.jpg/6100036a/o/w990`,
    `http://lamcdn.net/furfurmag.ru/post_image-image/OKXgbqwsF6tNSbmV_ghJaQ-wide.jpg`
];
const trendsReplies = {
    'Нулевые': ["За последний год всё больше набирает обороты. Те, кто был ребёнком во время нулевых годов 21 века, сейчас предпочитают одежду со стразами, джинсы с заниженной талией, одежду со стразами и яркими принтами. Эти элементы отлично вновь вошли в стиль многих людей.",
        "https://n1s2.hsmedia.ru/79/a7/5c/79a75c86f6e424acedc83ae9e5d46e07/728x542_1_4bfc73dc845a7405db186c28b7dc94fd@1200x894_0xac120003_10119314101642670543.jpeg",
        "https://n1s1.hsmedia.ru/71/af/43/71af43cd85158fbefb012e69111cee2c/728x1294_1_cad43bb1c5f714803db0f006d10a8295@1752x3114_0xac120003_1146984261596035094.jpg"
    ],

    'Монохром': ["Это тренд на образ образы в одной цветовой гамме (например в белой), данный тренд позволяет визуально корректировать фигуру человека, создавать впечатление статности и престижа.",
        "https://vogue.ua/media/cache/resolve/inline_990x/uploads/article-inline/ea2/e26/ed8/00_story_6198ed8e26ea2.jpeg",
        "https://mainstyles.ru/uploads/Muzhskoy-monokhrom-09.JPG"
    ],

    'Джинса': ["Раньше все думали, что джинсовые вещи ограничиваются на штанах, а остальные её проявления выглядят скучно и устарело, нестильно. Однако джинса была актуальна всегда, и сейчас также джинсовые вещи, куртки, джинсы, шорты, рубашки и пр. пользуется огромным спросом и интересом. Из них собираются классные образы, а джинсовые вещи доступны для каждого.",
        "https://www.notimeforstyle.com/wp-content/uploads/2020/03/f57efcb17b9f8b1086c6d5a39f59b98f.jpg",
        "https://shkatulka-krasoty.ru/wp-content/uploads/2019/02/dzhinsovaya-kurtka-oversize17.jpg"
    ],

    'Ugly fashion': ["Ugly fashion (уродская мода) сегодня выглядит просто красиво и стильно-скучно. Именно поэтому этот тренд является одним из ведущих в моде. Одеваться странно, возможно очень нестандартно и вызывающе, именно это привлекает людей а наше время и вызвать желание рассмотреть образ. Ярким представителем этого тренда является исполнитель Канье Уэст (Йе).",
        "https://www.zvuki.ru/images/photo/66/66704.jpg",
        "https://www.annarusska.ru/upload/resize_cache/content/7e5/1100_1570_1619711fa078991f0a23d032687646b21/digital_balenciaga_show.jpg"
    ],

    'Экологичность': ["В наше время, в связи с глобальными экологическими проблемами, стало очень модным среди производителей одежды активно заменять натуральные материалы (кожа, мех) на их альтернативу, то есть заменители (эко материалы).",
        "https://www.1000ideas.ru/upload/iblock/71f/Ekologichnost.jpg",
        "https://cdn.recyclemag.ru/main/a/aca5808b0c2bd3500283f11c9439e190.jpg"
    ],

    'Спортивный стиль': ["В период 21 века стильным является носить спортивную одежду не только на спорт, но и в повседневной жизни. Свободный крой, удобные дышащие материалы, долговечность – отличительные черты спортивного стиля. Сочетание спортивных элементов в официальном стиле также не редкость.",
        "https://i.pinimg.com/originals/eb/f2/a6/ebf2a6b1d3919d62a145ddac3aeab59e.jpg",
        "https://tntmusic.ru/media/content/article/2019-03-21_11-38-42__e1065f50-4bcd-11e9-9098-6fabf9eee960.jpg"
    ],

    'Кроссовки': ["За последние сорок лет тренд на спортивную обувь только набирает обороты. Если раньше кроссовки были удобной обувью для занятия спортом, то сегодня – это способ самовыражения, демонстрация своего стиля и даже достатка.",
        "https://images.complex.com/complex/images/c_fill,f_auto,g_center,w_1200/fl_lossy,pg_1/gbnoegixjz925hebqgn2/michael-jordan-1s-knicks-bulls-1998-madison-square-garden",
        "https://cdn.sanity.io/images/c1chvb1i/production/95cb11e25c0270b888b6290060696c9bb6129923-1100x735.jpg"
    ]
};

function cloneArray(arr) {
    return JSON.parse(JSON.stringify(arr));
};

bot.on('message', async msg => {
    if (msg.text in commands) {
        commands[msg.text](msg);
    } else if (msg.text in trendsReplies) {
        await(bot.sendMessage(msg.chat.id, trendsReplies[msg.text][0]));
        bot.sendPhoto(msg.chat.id, trendsReplies[msg.text][1]).
        then(bot.sendPhoto(msg.chat.id, trendsReplies[msg.text][2]));
    } else return;
});