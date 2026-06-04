import React from 'react'
import {
  Button,
  Card,
  CardBody,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Pagination,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react'
import { ChevronDown, FileOutput, Plus, Search } from 'lucide-react'
import type {Selection, SortDescriptor} from '@heroui/react';
import type { PaginatedData } from '@/types/api'

export interface Column<T> {
  name: string
  uid: string
  sortable?: boolean
  /** Truncate cell text with ellipsis and show full content on hover */
  truncate?: boolean
  /** Max width in px for truncated cells (default: 200) */
  maxWidth?: number
  render?: (item: T) => React.ReactNode
  exportValue?: (item: T) => string | number | null
}

function TruncatedCell({
  children,
  maxWidth = 200,
}: {
  children: React.ReactNode
  maxWidth?: number
}) {
  // Ref lives on the block-level div — inline elements return scrollWidth=0 per spec.
  const outerRef = React.useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const check = () => setIsOverflowing(el.scrollWidth > el.clientWidth)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // The outer div is always stable (ref + mouse events never move).
  // Popover is mounted inside it only once overflow is confirmed, so
  // the PopoverTrigger ref never conflicts with our measurement ref.
  return (
    <div
      ref={outerRef}
      style={{ maxWidth }}
      className={`truncate${isOverflowing ? ' cursor-help' : ''}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {isOverflowing ? (
        <Popover
          isOpen={isOpen}
          onOpenChange={() => {}}
          placement="top"
          offset={6}
          showArrow
        >
          <PopoverTrigger>
            <span>{children}</span>
          </PopoverTrigger>
          <PopoverContent>
            <div
              style={{ maxWidth: 360 }}
              className="text-sm whitespace-normal break-words py-1 px-0.5"
            >
              {children}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        children
      )}
    </div>
  )
}

interface DataTableProps<T> {
  data?: PaginatedData<T>
  columns: Array<Column<T>>
  isLoading?: boolean
  onSearch?: (value: string) => void
  onSortChange?: (descriptor: SortDescriptor) => void
  onPageChange?: (page: number) => void
  onLimitChange?: (limit: number) => void
  limit?: number
  onCreate?: () => void
  searchPlaceholder?: string
  emptyContent?: string
  initialSearch?: string
  sortDescriptor?: SortDescriptor
  headerSlot?: React.ReactNode
  onExport?: () => void
  isExporting?: boolean
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  isLoading = false,
  onSearch,
  onSortChange,
  onPageChange,
  onLimitChange,
  limit = 10,
  onCreate,
  searchPlaceholder = 'Cari...',
  emptyContent = 'Tidak ada data ditemukan.',
  initialSearch = '',
  sortDescriptor,
  headerSlot,
  onExport,
  isExporting = false,
}: DataTableProps<T>) {
  const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize visible columns with all column UIDs
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(
    new Set(columns.map((c) => c.uid)),
  )

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === 'all') return columns

    return columns.filter((column) =>
      Array.from(visibleColumns).includes(column.uid),
    )
  }, [visibleColumns, columns])

  const handleSearch = (value: string) => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    searchTimeout.current = setTimeout(() => {
      onSearch?.(value)
    }, 500)
  }

  return (
    <Card className="[view-transition-name:card-container] w-full bg-transparent! shadow-none border-none overflow-hidden mt-2 relative rounded-tr-none! rounded-3xl">
      <div className="flex flex-col md:flex-row items-start justify-between gap-0 bg-content1/80 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none rounded-t-3xl md:rounded-none overflow-hidden">
        <div className="flex items-start pr-6 md:pr-12 md:bg-content1/80 md:backdrop-blur-sm w-full md:w-auto md:flex-1 h-auto md:h-[200px] md:rounded-r-full p-4 md:p-6 pb-4 gap-2 overflow-x-auto no-scrollbar mask-linear-fade">
          <Input
            placeholder={searchPlaceholder}
            startContent={<Search size={12} className="text-slate-400" />}
            endContent={
              <div className="flex items-center justify-center bg-slate-100 dark:bg-background dark:text-white rounded-full shrink-0  h-8 w-8">
                <span className="text-xs font-bold text-slate-600 dark:text-white">
                  {data?.meta?.total || 0}
                </span>
              </div>
            }
            type="search"
            radius="full"
            defaultValue={initialSearch}
            onValueChange={handleSearch}
            className="max-w-full md:max-w-2xs shrink-0"
            classNames={{
              inputWrapper: 'pr-1',
            }}
          />
          {headerSlot && (
            <div className="flex items-center gap-2 shrink-0">{headerSlot}</div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 md:px-0 md:pt-4 pb-4 md:pb-0 w-full md:w-auto justify-start md:justify-end">
          {onCreate && (
            <Button
              isIconOnly
              radius="full"
              color="primary"
              variant="flat"
              onPress={onCreate}
            >
              <Plus size={12} />
            </Button>
          )}
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="flat"
                radius="full"
                endContent={
                  <ChevronDown size={10} className="text-slate-400" />
                }
                className="bg-content1 w-12"
              >
                {limit}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Rows per page"
              onAction={(key) => onLimitChange?.(Number(key))}
              selectedKeys={new Set([String(limit)])}
              selectionMode="single"
            >
              <DropdownItem key="10">10</DropdownItem>
              <DropdownItem key="20">20</DropdownItem>
              <DropdownItem key="30">30</DropdownItem>
              <DropdownItem key="50">50</DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="flat"
                radius="full"
                endContent={
                  <ChevronDown size={10} className="text-slate-400" />
                }
                className="bg-content1"
              >
                Columns
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              disallowEmptySelection
              aria-label="Toggle Columns"
              closeOnSelect={false}
              selectedKeys={visibleColumns}
              selectionMode="multiple"
              onSelectionChange={setVisibleColumns}
            >
              {columns.map((column) => (
                <DropdownItem key={column.uid} className="capitalize">
                  {column.name}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
          <Button
            radius="full"
            variant="flat"
            startContent={!isExporting && <FileOutput size={12} />}
            className="bg-content1"
            onPress={onExport}
            isLoading={isExporting}
            isDisabled={!onExport || isExporting}
          >
            Export
          </Button>
        </div>
      </div>
      <CardBody className="p-0 bg-content1/80 backdrop-blur-sm mt-0 md:-mt-32 rounded-none md:rounded-tr-4xl">
        {/* Table */}
        {isLoading ? (
          <Table
            aria-label="Loading Data"
            shadow="none"
            classNames={{
              base: 'px-4 pb-4',
              wrapper: 'bg-transparent shadow-none',
              table: '',
              th: 'bg-transparent text-slate-400 font-normal text-xs uppercase tracking-wider border-b border-slate-100',
              td: 'py-4 border-b border-slate-50 group-last:border-none',
              tr: 'hover:bg-slate-50/50 transition-colors',
            }}
          >
            <TableHeader columns={headerColumns}>
              {(column) => (
                <TableColumn key={column.uid} allowsSorting={column.sortable}>
                  {column.name}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {headerColumns.map((column) => (
                    <TableCell key={column.uid}>
                      <Skeleton className="rounded-lg">
                        <div className="h-3 w-4/5 rounded-lg bg-default-200"></div>
                      </Skeleton>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table
            aria-label="Data Table"
            shadow="none"
            classNames={{
              base: 'px-4 pb-4',
              wrapper: 'bg-transparent shadow-none',
              table: '',
              th: 'bg-transparent text-slate-400 font-normal text-xs uppercase tracking-wider border-b border-slate-100',
              td: 'py-4 border-b border-slate-50 group-last:border-none',
              tr: 'hover:bg-slate-50/50 transition-colors data-[selected=true]:bg-primary-50/50',
            }}
            selectionMode="none"
            color="primary"
            sortDescriptor={sortDescriptor}
            onSortChange={onSortChange}
            bottomContent={
              data?.meta?.last_page && data.meta.last_page > 1 ? (
                <div className="flex w-full justify-end">
                  <Pagination
                    isCompact
                    showControls
                    showShadow
                    color="primary"
                    page={data.meta.page}
                    total={data.meta.last_page}
                    onChange={onPageChange}
                  />
                </div>
              ) : null
            }
          >
            <TableHeader columns={headerColumns}>
              {(column) => (
                <TableColumn key={column.uid} allowsSorting={column.sortable}>
                  {column.name}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody emptyContent={emptyContent} items={data?.data || []}>
              {(item) => (
                <TableRow key={item.id}>
                  {(columnKey) => {
                    const column = columns.find((c) => c.uid === columnKey)
                    const raw = column?.render ? column.render(item) : (item as any)[columnKey]
                    return (
                      <TableCell>
                        {column?.truncate ? (
                          <TruncatedCell maxWidth={column.maxWidth}>
                            {raw}
                          </TruncatedCell>
                        ) : raw}
                      </TableCell>
                    )
                  }}
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardBody>
    </Card>
  )
}

export function useDataTable(routeApi: any) {
  const navigate = routeApi.useNavigate()
  const searchParams = routeApi.useSearch()

  const page = searchParams.page || 1
  const perPage = searchParams.limit || 10
  const search = searchParams.search || ''
  const sortDescriptor: SortDescriptor = {
    column: searchParams.sort || 'createdAt',
    direction: searchParams.direction === 'asc' ? 'ascending' : 'descending',
  }

  const onSearch = (value: string) =>
    navigate({ search: (prev: any) => ({ ...prev, search: value, page: 1 }) })

  const onSortChange = (descriptor: SortDescriptor) =>
    navigate({
      search: (prev: any) => ({
        ...prev,
        sort: descriptor.column,
        direction: descriptor.direction === 'ascending' ? 'asc' : 'desc',
      }),
    })

  const onPageChange = (page: number) =>
    navigate({ search: (prev: any) => ({ ...prev, page }) })

  const onLimitChange = (limit: number) =>
    navigate({ search: (prev: any) => ({ ...prev, limit, page: 1 }) })

  return {
    page,
    limit: perPage,
    search,
    sortDescriptor,
    onSearch,
    onSortChange,
    onPageChange,
    onLimitChange,
  }
}
