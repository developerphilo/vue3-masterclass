<template>
  <div v-if="asyncDataStatus_ready">
    <h1 class="text-center push-top">Welcome to The Forum</h1>
    <div class="wdmr">
      <CategoryListItem :categories="categories" />
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";
import CategoryListItem from "@/components/CategoryListItem";
import asyncDataStatus from "@/mixins/AsyncDataStatus";
export default {
  components: {
    CategoryListItem,
  },
  mixins: [asyncDataStatus],
  computed: {
    categories() {
      return this.$store.state.categories.items;
    },
  },
  methods: {
    ...mapActions("categories", ["fetchAllCategories"]),
    ...mapActions("forums", ["fetchForums"]),
  },
  async created() {
    const categories = await this.fetchAllCategories();
    const forumIds = categories.map((category) => category.forums).flat();
    await this.fetchForums({ ids: forumIds });
    this.asyncDataStatus_fetched();
  },
};
</script>
<style scoped></style>
