import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { LoaderCircleIcon } from '@/components/ui/icons'
import { Textarea } from '@/components/ui/textarea'

import {
  createExplorationTeam,
  explorationTeamErrorMessage,
  updateExplorationTeam,
  type ExplorationTeam,
  type ExplorationTeamInput,
} from './exploration-team-api'

export function ExplorationTeamDialog({
  open,
  team,
  onOpenChange,
}: {
  open: boolean
  team?: ExplorationTeam
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [input, setInput] = useState<ExplorationTeamInput>(emptyInput)
  const [nameError, setNameError] = useState<string>()
  const mutation = useMutation({
    mutationFn: () => team
      ? updateExplorationTeam(team.id, input, team.updatedAt)
      : createExplorationTeam(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exploration-teams'] })
      toast.success(team ? '勘探小组已更新' : '勘探小组已创建')
    },
  })

  useEffect(() => {
    if (!open) return
    setInput(team ? { name: team.name, description: team.description } : emptyInput)
    setNameError(undefined)
    mutation.reset()
  }, [open, team])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (mutation.isPending) return
    const name = input.name.trim()
    if (!name) {
      setNameError('请输入小组名称')
      return
    }
    setNameError(undefined)
    try {
      await mutation.mutateAsync()
      onOpenChange(false)
    } catch {
      // The stable API error is shown in the dialog.
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!mutation.isPending) onOpenChange(nextOpen) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{team ? '编辑勘探小组' : '新增勘探小组'}</DialogTitle>
          <DialogDescription>维护小组名称和工作说明；小组成员在成员管理中单独配置。</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor="exploration-team-name">小组名称 *</FieldLabel>
              <Input
                id="exploration-team-name"
                maxLength={64}
                disabled={mutation.isPending}
                value={input.name}
                aria-invalid={Boolean(nameError)}
                onChange={(event) => setInput((current) => ({ ...current, name: event.target.value }))}
              />
              <FieldError>{nameError}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="exploration-team-description">工作说明</FieldLabel>
              <Textarea
                id="exploration-team-description"
                maxLength={500}
                rows={4}
                disabled={mutation.isPending}
                value={input.description}
                onChange={(event) => setInput((current) => ({ ...current, description: event.target.value }))}
              />
            </Field>
            {mutation.isError ? <FieldError>{explorationTeamErrorMessage(mutation.error)}</FieldError> : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}
              {team ? '保存修改' : '创建小组'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const emptyInput: ExplorationTeamInput = { name: '', description: '' }
