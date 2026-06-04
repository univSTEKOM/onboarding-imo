import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'
import { getRouteApi } from '@tanstack/react-router'
import { useAppMutation } from './use-mutations'
import { useExportExcel } from './use-export-excel'
import type { Media } from '@/types/media'
import type { PaginatedData } from '@/types/api'
import { useDataTable } from '@/components/templates/datatable'
import { deleteMedia, getMediaList, uploadMedia } from '@/lib/services/media.service'
import { getColumns } from '@/components/features/media/columns'
import { useUserPermission } from '@/hooks/use-permissions'
import { useConfirmation } from '@/hooks/use-confirmation'
import { useMediaUiStore } from '@/lib/stores/media-ui.store'

const routeApi = getRouteApi('/(media)/media')

// --- Data Hooks ---

export const useMedia = () => {
  const { page, limit, search, sort, direction } = routeApi.useSearch()

  return useQuery({
    queryKey: ['media', { page, limit, search, sort, direction }],
    queryFn: async () => {
      const response = await getMediaList({
        page: page || 1,
        limit: limit || 10,
        search: search || '',
        sort: sort || 'createdAt',
        direction: direction || 'desc',
        paginated: true,
      })
      return response as unknown as PaginatedData<Media>
    },
    placeholderData: keepPreviousData,
  })
}

export const useUploadMedia = () => {
  return useAppMutation({
    mutationFn: uploadMedia,
    invalidateKeys: ['media'],
    successMessage: 'File uploaded successfully',
  })
}

// --- Page Hook ---

export const useMediaPage = () => {
  const tableState = useDataTable(routeApi)
  const { data, isLoading } = useMedia()
  const { hasPermission } = useUserPermission()
  const { confirm } = useConfirmation()

  const ui = useMediaUiStore(
    useShallow((s) => ({
      open: s.open,
      onOpenChange: s.onOpenChange,
      viewOpen: s.modals.view.isOpen,
      viewEntity: s.modals.view.entity,
    })),
  )

  const deleteMutation = useAppMutation({
    mutationFn: deleteMedia,
    invalidateKeys: ['media'],
    successMessage: 'Media deleted successfully',
  })

  const handleView = (media: Media) => ui.open('view', media)

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Delete Media',
      message: 'Are you sure?',
      color: 'danger'
    })
    if (isConfirmed) deleteMutation.mutate(id)
  }

  const columns = getColumns({
    onView: handleView,
    onDelete: handleDelete,
    hasPermission,
  })

  const { onExport, isExporting } = useExportExcel({
    filename: 'Media',
    sheetName: 'Media',
    columns,
    fetchAll: async () => {
      const res = await getMediaList({ paginated: false })
      return Array.isArray(res) ? res : (res as any)?.data || []
    },
  })

  return {
    tableProps: {
      data,
      columns,
      isLoading,
      onExport,
      isExporting,
      ...tableState,
      initialSearch: tableState.search,
    },
    modalProps: {
      isOpen: ui.viewOpen,
      onOpenChange: ui.onOpenChange('view'),
      media: ui.viewEntity,
    },
  }
}
