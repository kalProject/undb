import type { IQueryRecords, TreeField } from '@egodb/core'
import { useLazyTreeAvailableQuery } from '@egodb/store'
import type { MultiSelectProps } from '@egodb/ui'
import { Group } from '@egodb/ui'
import { Loader, MultiSelect } from '@egodb/ui'
import { forwardRef, useEffect, useState } from 'react'
import { useCurrentTable } from '../../hooks/use-current-table'
import { RecordValue } from '../field-value/record-value'
import { FieldIcon } from './field-Icon'

interface IProps extends Omit<MultiSelectProps, 'data'> {
  field: TreeField
  recordId?: string
}

interface ItemProps extends React.ComponentPropsWithoutRef<'div'> {
  value: string
  label: string
}

const TreeSelectItem = forwardRef<HTMLDivElement, ItemProps>(({ label, ...others }: ItemProps, ref) => (
  <Group ref={ref} p="xs" {...others}>
    <RecordValue value={label} />
  </Group>
))

export const TreeRecordsPicker: React.FC<IProps> = ({ field, recordId, ...rest }) => {
  const [focused, setFocused] = useState(false)
  const [getRecords, { rawRecords, isLoading }] = useLazyTreeAvailableQuery({
    selectFromResult: (result) => ({
      ...result,
      rawRecords: (Object.values(result.data?.entities ?? {}) ?? []).filter(Boolean) as IQueryRecords,
    }),
  })

  const table = useCurrentTable()

  useEffect(() => {
    getRecords({ tableId: table.id.value, treeFieldId: field.id.value, recordId })
  }, [focused])

  const data = [
    ...(rest.value?.map((id) => ({ value: id, label: id })) ?? []),
    ...(rawRecords?.map((record) => ({
      value: record.id,
      label: field.getDisplayValues(record.displayValues).toString(),
    })) ?? []),
  ]

  return (
    <MultiSelect
      {...rest}
      multiple
      searchable
      clearable
      description={focused && !rawRecords.length ? 'no more available record to select' : undefined}
      itemComponent={TreeSelectItem}
      data={data}
      onFocus={() => setFocused(true)}
      placeholder={focused && isLoading ? 'loading records...' : undefined}
      disabled={focused && isLoading}
      icon={focused && isLoading ? <Loader color="gray" size={14} /> : <FieldIcon type={field.type} />}
    />
  )
}
