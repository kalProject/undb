<script lang="ts">
  import type { ReferenceField } from "@undb/table"
  import ForeignRecordsPickerDropdown from "../reference/foreign-records-picker-dropdown.svelte"
  import { Button } from "$lib/components/ui/button"
  import { writable, type Writable } from "svelte/store"
  import { onMount } from "svelte"

  export let value: string[] | null
  export let field: ReferenceField
  export let r: Writable<string | null>
  export let tableId: string
  export let recordId: string | undefined
  export let readonly: boolean = false

  let selected = writable<string[]>(value ?? [])

  onMount(() => {
    selected.set(value ?? [])
  })
  $: $selected, (value = $selected)

  let hasValue = Array.isArray($selected) && $selected.length > 0
  $: hasValueReactive = Array.isArray($selected) && $selected.length > 0
  $: if (hasValue && !hasValueReactive) {
    hasValue = hasValueReactive
  }
</script>

<div class="flex gap-1 overflow-hidden">
  <ForeignRecordsPickerDropdown
    shouldUpdate
    onOpenChange={(open) => {
      if (!open) {
        hasValue = hasValueReactive
      }
    }}
    {field}
    {tableId}
    {recordId}
    bind:isSelected={hasValue}
    bind:selected
    {r}
    let:builder
    {readonly}
  >
    {#if hasValueReactive}
      <Button size="xs" variant="link" class="px-0" builders={[builder]} on:click={(e) => e.stopPropagation()}>
        {value?.length} Linked Records
      </Button>
    {:else}
      <Button
        size="xs"
        variant="link"
        type="button"
        class="text-muted-foreground px-0"
        builders={[builder]}
        on:click={(e) => e.stopPropagation()}
      >
        + Link Records
      </Button>
    {/if}
  </ForeignRecordsPickerDropdown>
</div>
