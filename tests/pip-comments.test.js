import { describe, test, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Разбор ответа чистый, chrome нужен только панели (create() здесь не зовём),
// но модуль браузерный — заглушка страхует от обращения на верхнем уровне.
globalThis.chrome = globalThis.chrome || { i18n: { getMessage: () => "" } };

require("../extension/content/constants.js");
const pipComments = require("../extension/content/pip-comments.js");
const { parsePage, findCommentToken } = pipComments;

/** Минимальный ответ innertube: одна мутация + один тред, ссылающийся на неё. */
function makeBody({ comments = [], nextToken = null, useAppend = false } = {}) {
  const continuationItems = comments.map((comment) => ({
    commentThreadRenderer: {
      commentViewModel: { commentViewModel: { commentKey: comment.key, pinnedText: comment.pinnedText } }
    }
  }));
  if (nextToken !== null) {
    continuationItems.push({
      continuationItemRenderer: {
        continuationEndpoint: { continuationCommand: { token: nextToken } }
      }
    });
  }
  const command = useAppend
    ? { appendContinuationItemsAction: { continuationItems } }
    : { reloadContinuationItemsCommand: { continuationItems } };
  return {
    onResponseReceivedEndpoints: [command],
    frameworkUpdates: {
      entityBatchUpdate: {
        mutations: comments
          .filter((comment) => !comment.omitPayload)
          .map((comment) => ({ payload: { commentEntityPayload: comment.payload } }))
      }
    }
  };
}

const PAYLOAD = {
  key: "key-1",
  author: { displayName: "Ada", avatarThumbnailUrl: "https://x/a.jpg", isCreator: true },
  properties: { content: { content: "hello" }, publishedTime: "2 days ago" },
  toolbar: { likeCountNotliked: "12", replyCount: "3" }
};

describe("parsePage", () => {
  test("maps a comment through its mutation payload", () => {
    const { comments } = parsePage(makeBody({ comments: [{ key: "key-1", payload: PAYLOAD }] }));
    expect(comments).toEqual([
      {
        author: "Ada",
        avatar: "https://x/a.jpg",
        isCreator: true,
        text: "hello",
        published: "2 days ago",
        likes: "12",
        replies: "3",
        pinned: false
      }
    ]);
  });

  test("matches payloads by key, not by position", () => {
    // Порядок мутаций обратный порядку тредов — привязка по ключу обязана
    // выдержать это, иначе комментарии перемешаются с чужими авторами.
    const body = makeBody({
      comments: [
        { key: "key-1", payload: { ...PAYLOAD, key: "key-1", properties: { content: { content: "first" } } } },
        { key: "key-2", payload: { ...PAYLOAD, key: "key-2", properties: { content: { content: "second" } } } }
      ]
    });
    body.frameworkUpdates.entityBatchUpdate.mutations.reverse();
    const { comments } = parsePage(body);
    expect(comments.map((comment) => comment.text)).toEqual(["first", "second"]);
  });

  test("skips a thread whose payload is missing", () => {
    const { comments } = parsePage(
      makeBody({ comments: [{ key: "key-1", payload: PAYLOAD, omitPayload: true }] })
    );
    expect(comments).toEqual([]);
  });

  test("reads the continuation token for the next page", () => {
    const { nextToken } = parsePage(
      makeBody({ comments: [{ key: "key-1", payload: PAYLOAD }], nextToken: "TOKEN" })
    );
    expect(nextToken).toBe("TOKEN");
  });

  test("reads items from appendContinuationItemsAction too", () => {
    const { comments } = parsePage(
      makeBody({ comments: [{ key: "key-1", payload: PAYLOAD }], useAppend: true })
    );
    expect(comments).toHaveLength(1);
  });

  test("marks a pinned comment", () => {
    const { comments } = parsePage(
      makeBody({ comments: [{ key: "key-1", payload: PAYLOAD, pinnedText: { content: "Pinned" } }] })
    );
    expect(comments[0].pinned).toBe(true);
  });

  test("fills missing fields with empty strings instead of undefined", () => {
    const { comments } = parsePage(makeBody({ comments: [{ key: "key-1", payload: { key: "key-1" } }] }));
    expect(comments[0]).toEqual({
      author: "",
      avatar: "",
      isCreator: false,
      text: "",
      published: "",
      likes: "",
      replies: "",
      pinned: false
    });
  });

  test("returns empty results for a response of an unexpected shape", () => {
    expect(parsePage({})).toEqual({ comments: [], nextToken: null });
  });
});

describe("findCommentToken", () => {
  const token = { continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: "SECTION" } } } };

  test("finds the token however deep the section sits", () => {
    const body = { a: { b: [{ sectionIdentifier: "comment-item-section", contents: [token] }] } };
    expect(findCommentToken(body)).toBe("SECTION");
  });

  test("ignores sections other than the comments one", () => {
    const body = { a: { sectionIdentifier: "some-other-section", contents: [token] } };
    expect(findCommentToken(body)).toBeNull();
  });

  test("returns null when the section carries no continuation", () => {
    const body = { a: { sectionIdentifier: "comment-item-section", contents: [] } };
    expect(findCommentToken(body)).toBeNull();
  });

  test("returns null for a response of an unexpected shape", () => {
    expect(findCommentToken({})).toBeNull();
  });
});
