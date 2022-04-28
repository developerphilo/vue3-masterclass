import { docToResource, findById } from "@/helpers";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

export default {
  async createPost({ commit, state }, post) {
    post.userId = state.authId;
    post.publishedAt = firebase.firestore.FieldValue.serverTimestamp();
    // store data to firebase database
    const batch = firebase.firestore().batch();
    const postRef = firebase.firestore().collection("posts").doc();
    const threadRef = firebase
      .firestore()
      .collection("threads")
      .doc(post.threadId);
    const userRef = firebase.firestore().collection("users").doc(state.authId);
    batch.set(postRef, post);
    batch.update(threadRef, {
      posts: firebase.firestore.FieldValue.arrayUnion(postRef.id),
      contributors: firebase.firestore.FieldValue.arrayUnion(state.authId),
    });
    batch.update(userRef, {
      postCount: firebase.firestore.FieldValue.increment(1),
    });
    await batch.commit();
    const newPost = await postRef.get();
    commit("setItem", {
      resource: "posts",
      item: { ...newPost.data(), id: newPost.id },
    });
    commit("appendPostToThread", {
      childId: newPost.id,
      parentId: post.threadId,
    });
    commit("appendContributorToThread", {
      childId: state.authId,
      parentId: post.threadId,
    });
  },
  updateUser({ commit }, user) {
    commit("setItem", { resource: "users", item: user });
  },
  fetchCategory: ({ dispatch }, { id }) =>
    dispatch("fetchItem", { resource: "categories", id }),
  fetchForum: ({ dispatch }, { id }) =>
    dispatch("fetchItem", { resource: "forums", id }),
  fetchThread: ({ dispatch }, { id }) =>
    dispatch("fetchItem", { resource: "threads", id }),
  fetchUser: ({ dispatch }, { id }) =>
    dispatch("fetchItem", { resource: "users", id }),
  fetchPost: ({ dispatch }, { id }) =>
    dispatch("fetchItem", { resource: "posts", id }),
  fetchAuthUser: ({ dispatch, state }) =>
    dispatch("fetchUser", { id: state.authId }),
  fetchAllCategories({ commit }) {
    return new Promise((resolve) => {
      firebase
        .firestore()
        .collection("categories")
        .onSnapshot((querySnapshot) => {
          const categories = querySnapshot.docs.map((doc) => {
            const item = { id: doc.id, ...doc.data() };
            commit("setItem", { resource: "categories", item });
            return item;
          });
          resolve(categories);
        });
    });
  },
  fetchThreads: ({ dispatch }, { ids }) =>
    dispatch("fetchItems", { resource: "threads", ids }),
  fetchCategories: ({ dispatch }, { ids }) =>
    dispatch("fetchItems", {
      resource: "categories",
      ids,
    }),
  fetchForums: ({ dispatch }, { ids }) =>
    dispatch("fetchItems", { resource: "forums", ids }),
  fetchUsers: ({ dispatch }, { ids }) =>
    dispatch("fetchItems", { resource: "users", ids }),
  fetchPosts: ({ dispatch }, { ids }) =>
    dispatch("fetchItems", { resource: "posts", ids }),
  fetchItem({ commit }, { id, resource }) {
    return new Promise((resolve) => {
      firebase
        .firestore()
        .collection(resource)
        .doc(id)
        .onSnapshot((doc) => {
          const item = { ...doc.data(), id: doc.id };
          commit("setItem", { resource, id, item: item });
          resolve(item);
        });
    });
  },
  fetchItems({ dispatch }, { ids, resource, onSnapshot = null }) {
    ids = ids || [];
    return Promise.all(
      ids.map((id) => dispatch("fetchItem", { id, resource, onSnapshot }))
    );
  },
  async createThread({ commit, state, dispatch }, { text, title, forumId }) {
    const userId = state.authId;
    const publishedAt = firebase.firestore.FieldValue.serverTimestamp();
    const threadRef = firebase.firestore().collection("threads").doc();
    const thread = { forumId, publishedAt, title, userId, id: threadRef.id };
    const userRef = firebase.firestore().collection("users").doc(userId);
    const forumRef = firebase.firestore().collection("forums").doc(forumId);
    const batch = firebase.firestore().batch();
    batch.set(threadRef, thread);
    batch.update(userRef, {
      threads: firebase.firestore.FieldValue.arrayUnion(threadRef.id),
    });
    batch.update(forumRef, {
      threads: firebase.firestore.FieldValue.arrayUnion(threadRef.id),
    });
    await batch.commit();
    const newThread = await threadRef.get();
    commit("setItem", {
      resource: "threads",
      item: { ...newThread.data(), id: newThread.id },
    });
    commit("appendThreadToForum", { parentId: forumId, childId: threadRef.id });
    commit("appendThreadToUser", { parentId: userId, childId: threadRef.id });
    await dispatch("createPost", { text, threadId: threadRef.id });
    return findById(state.threads, threadRef.id);
  },
  async updateThread({ commit, state }, { title, text, id }) {
    const thread = state.threads.find((t) => t.id === id);
    const post = findById(state.posts, thread.posts[0]);
    let newThread = { ...thread, title };
    let newPost = { ...post, text };

    const threadRef = firebase.firestore().collection("threads").doc(id);
    const postRef = firebase.firestore().collection("posts").doc(post.id);
    const batch = firebase.firestore().batch();
    batch.update(threadRef, newThread);
    batch.update(postRef, newPost);
    await batch.commit();
    newThread = await threadRef.get();
    newThread = { ...newThread.data(), id: newThread.id };
    newPost = await postRef.get();
    newPost = { ...newPost.data(), id: newPost.id };
    commit("setItem", { resource: "threads", item: newThread });
    commit("setItem", { resource: "posts", item: newPost });
    return docToResource(newThread);
  },
};
