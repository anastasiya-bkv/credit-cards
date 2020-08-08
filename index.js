const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const argon2 = require("argon2");
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: "ОНЛАЙН ХАКАТОН", cookie: { maxAge: 600000 } }));

let users = null;

app.listen(3001, async () => {
  users = {
    Анастасия: {
      id: 1,
      login: "Анастасия",
      pass: await argon2.hash("ХАКАТОН"),
      cards: [
        {
          id: 1,
          name: "новая карта",
          type: "VISA",
          no: "4154 8120 1234 5678",
          expires: "12/22",
          cvv: "777",
          balance: 5045.78,
          history: [],
        },
        {
          id: 2,
          name: "моя карта",
          type: "master card",
          no: "4154 0000 3333 1111",
          expires: "05/24",
          cvv: "555",
          balance: 27098.04,
          history: [
            {
              dateTime: "12.06.2020 13:54",
              type: "поступление",
              sum: 1050.5,
              contractor: "Работа",
            },
            {
              dateTime: "14.07.2020 18:05",
              type: "списание",
              sum: 450.07,
              contractor: "Магнит",
            },
          ],
        },
      ],
    },
    Васька: {
      id: 2,
      login: "Васька",
      pass: await argon2.hash("Котик"),
      cards: [],
    },
  };
  console.log("Сервер запущен на порте 3001");
});

app.get("/login", (req, res) => {
  res.json({
    ok: false,
    error: "Нужен POST запрос с параметрами login и pass",
  });
});

// Проверка авторизации
app.get("/check-login", (req, res) => {
  res.json({
    ok: true,
    result: req.session.user ? `Логин: ${req.session.user}` : "Не залогинен",
  });
});

// Запросить список банковских карт, доступных пользователю
app.get("/cards", (req, res) => {
  const userName = req.session.user;
  if (!userName) {
    res.json({
      ok: false,
      error:
        "Требуется авторизация: POST-запрос к /login с параметрами login и pass",
    });
    return;
  }
  const { cards } = users[userName];

  const cardList = cards.map((card) => {
    const { id, name, no, type } = card;
    return { id, name, no, type };
  });

  res.json({
    ok: true,
    result: cards.length > 0 ? cardList : "Нет доступных карт",
  });
});

// Авторизация пользователя
app.post("/login", async (req, res) => {
  try {
    const { login, pass } = req.body;
    if (!login || !pass) {
      res.json({
        ok: false,
        error: "Отсутствует POST-параметр login либо pass, либо оба",
      });
      return;
    }
    const maybeUser = users[login];
    const passMatches = await (maybeUser &&
      argon2.verify(maybeUser.pass, pass));

    if (!passMatches) {
      res.json({ ok: false, error: "login не найден, либо pass не подходит" });
      return;
    }

    req.session.user = login;

    res.json({ ok: true });
  } catch (e) {
    console.log(e);
    res.json({ ok: false, error: "Ошибка, см. консоль сервера" });
  }
});

app.get("/card", (req, res) => {
  res.json({ ok: false, error: "Необходим id карты GET-параметрах" });
  return;
});

// Запросить детальную информацию по банковской карте, доступной пользователю: PAN xxxx xxxx xxxx 1234,
// месяц и год истечения, текущий баланс
app.get("/card/:id", (req, res) => {
  const userName = req.session.user;
  if (!userName) {
    res.json({
      ok: false,
      error:
        "Требуется авторизация: POST-запрос к /login с параметрами login и pass",
    });
    return;
  }

  const id = req.params.id;
  if (!Number.isInteger(+id)) {
    res.json({ ok: false, error: "Необходим id карты  GET-параметрах" });
    return;
  }

  const card = users[userName].cards.find((card) => card.id === +id);

  if (!card) {
    res.json({ ok: false, error: "Такой карты не существует" });
    return;
  }

  const { no, expires, balance } = card;

  res.json({
    ok: true,
    result: { no, expires, balance },
  });
});

// Запросить историю движения денежных средства по банковской карте, доступной пользователю: дата/время,
// тип операции (поступление, списание), сумма операции, контрагент
app.get("/history/:id", (req, res) => {
  const userName = req.session.user;
  if (!userName) {
    res.json({
      ok: false,
      error:
        "Требуется авторизация: POST-запрос к /login с параметрами login и pass",
    });
    return;
  }

  const id = req.params.id;
  if (!Number.isInteger(+id)) {
    res.json({ ok: false, error: "Необходим id карты  GET-параметрах" });
    return;
  }

  const card = users[userName].cards.find((card) => card.id === +id);

  if (!card) {
    res.json({ ok: false, error: "Такой карты не существует" });
    return;
  }

  const { history } = card;
  res.json({
    ok: true,
    result: history.length > 0 ? history : "Нет истории операций",
  });
});

app.get("/history", (req, res) => {
  res.json({ ok: false, error: "Необходим id карты GET-параметрах" });
  return;
});
