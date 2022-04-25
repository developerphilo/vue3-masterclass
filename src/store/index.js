import { createStore } from "vuex";
import data from "@/data";
import { findById, upsert } from "@/helpers";

const store = createStore({
  state: {
    ...data,
    authId: "VXjpr2WHa8Ux4Bnggym8QFLdv5C3",
  },
  getters: {
    authUser: (state) => {
      const user = findById(state.users, state.authId);
      if (!user) return null;
      return {
        ...user,
        get posts() {
          return state.posts.filter((p) => p.userId === user.id);
        },
        get postCount() {
          return this.posts.length;
        },
        get threads() {
          return state.threads.filter((t) => t.threadId === user.id);
        },
        get threadsCount() {
          return this.threads.length;
        },
      };
    },
    thread: (state) => {
      return (id) => {
        const thread = findById(state.threads, id);
        return {
          ...thread,
          get author() {
            return findById(state.users, thread.userId);
          },
          get repliesCount() {
            return thread.posts.length - 1;
          },
          get contributorsCount() {
            return thread.contributors.length;
          },
        };
      };
    },
  },
  actions: {
    createPost({ commit, state }, post) {
      post.id = "john" + Math.random();
      post.userId = state.authId;
      (post.publishedAt = Math.floor(Date.now() / 1000)),
        commit("setPost", { post });
      commit("appendPostToThread", {
        childId: post.id,
        parentId: post.threadId,
      });
    },
    updateUser({ commit }, user) {
      commit("setUser", { user, userId: user.id });
    },
    async createThread({ commit, state, dispatch }, { text, title, forumId }) {
      const id = "john" + Math.random();
      const userId = state.authId;
      const publishedAt = Math.floor(Date.now() / 1000);
      const thread = { forumId, publishedAt, title, userId, id };
      commit("setThread", { thread });
      commit("appendThreadToForum", { forumId, threadId: id });
      commit("appendThreadToUser", { userId, threadId: id });
      dispatch("createPost", { text, threadId: id });
      return state.threads.find((n) => n.id === id);
    },
    async updateThread({ commit, state }, { title, text, id }) {
      const thread = state.threads.find((t) => t.id === id);
      const post = findById(state.posts, thread.posts[0]);
      const newThread = { ...thread, title };
      const newPost = { ...post, text };
      commit("setThread", { thread: newThread });
      commit("setPost", { post: newPost });
    },
  },
  mutations: {
    setPost(state, { post }) {
      upsert(state.posts, post);
    },
    setThread(state, { thread }) {
      upsert(state.threads, thread);
    },
    setUser(state, { user, userId }) {
      const userIndex = findById(state.users, userId);
      state.users[userIndex] = user;
    },
    appendPostToThread: appendChildToParentMutation({
      parent: "threads",
      child: "posts",
    }),
    appendThreadToForum: appendChildToParentMutation({
      parent: "forums",
      child: "threads",
    }),
    appendThreadToUser: appendChildToParentMutation({
      parent: "users",
      child: "threads",
    }),
  },
});

function appendChildToParentMutation({ parent, child }) {
  return (state, { childId, parentId }) => {
    const resource = findById(state[parent], parentId);
    resource[child] = resource[child] || [];
    if (!resource[child].includes(childId)) {
      resource[child].push(childId);
    }
  };
}
export default store;
