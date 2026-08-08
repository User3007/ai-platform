from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_admin
from app.models.user import User
from app.schemas.rag import RagDocumentListResponse, RagDocumentResponse
from app.services.rag_service import delete_document, get_document, list_documents, save_uploaded_document

router = APIRouter(dependencies=[Depends(require_admin)])


def _serialize_document(document, uploaded_by_email: str | None = None) -> RagDocumentResponse:
    return RagDocumentResponse(
        id=str(document.id),
        filename=document.filename,
        original_filename=document.original_filename,
        content_type=document.content_type,
        size_bytes=document.size_bytes,
        status=document.status,
        error_message=document.error_message,
        page_count=document.page_count,
        chunk_count=document.chunk_count,
        uploaded_by_email=uploaded_by_email,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@router.get("/documents", response_model=RagDocumentListResponse)
@router.get("/documents/", response_model=RagDocumentListResponse)
async def admin_list_documents(db: AsyncSession = Depends(get_db)):
    documents = await list_documents(db)
    items = [_serialize_document(document, getattr(document.uploaded_by, "email", None)) for document in documents]
    return RagDocumentListResponse(items=items)


@router.post("/documents", response_model=RagDocumentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/documents/", response_model=RagDocumentResponse, status_code=status.HTTP_201_CREATED)
async def admin_upload_document(
    file: UploadFile = File(...),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    document = await save_uploaded_document(db, file, admin_user)
    await db.commit()
    await db.refresh(document)
    return _serialize_document(document, admin_user.email)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/documents/{document_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    document = await get_document(db, UUID(document_id))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    await delete_document(db, document)
    await db.commit()