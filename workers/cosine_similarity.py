import os
import traceback
from typing import List, Optional, TypedDict

import numpy as np
import pandas as pd
from bson import json_util
from bson.objectid import ObjectId
from openai.embeddings_utils import cosine_similarity
from pymongo.collection import Collection
from pymongo.database import Database
from redis import Redis

EMBEDDINGS_TTL = 5 * 60


class KbEmbedding(TypedDict):
    _id: Optional[ObjectId]
    knowledgebaseId: ObjectId
    embededdings: List[float]


class ChunkEmbedding(TypedDict):
    chunkId: Optional[ObjectId]
    embeddings: List[float]


class Embeddings(TypedDict):
    _id: Optional[ObjectId]
    embeddings: List[ChunkEmbedding]


def get_embeddings_for_knowledgebase(
    id: str,
    db: Database,
    r: Redis,
) -> Embeddings:
    embedding_collection = db["kbEmbeddings"]
    kb_id = ObjectId(id)
    cache_key = f"e_{id}"

    cached_embeddings = r.get(cache_key)

    if cached_embeddings is not None:
        return json_util.loads(cached_embeddings)

    # Try both ObjectId and string forms to handle legacy documents
    matching_obj = embedding_collection.count_documents({"knowledgebaseId": kb_id})
    matching_str = embedding_collection.count_documents({"knowledgebaseId": id})

    kb_id_query = id if (matching_str > 0 and matching_obj == 0) else kb_id

    kb_embeddings = embedding_collection.find(
        {"knowledgebaseId": kb_id_query},
        {"_id": 1, "embeddings": 1},
    )

    embeddings: Embeddings = {
        "_id": kb_id,
        "embeddings": [],
    }

    for embedding in kb_embeddings:
        embeddings["embeddings"].append(
            {
                "chunkId": embedding["_id"],
                "embeddings": embedding["embeddings"],
            }
        )


    r.set(cache_key, json_util.dumps(embeddings), ex=EMBEDDINGS_TTL)

    return embeddings

def get_top_chunks(
    target_embedding: List[float],
    knowledgebase_id: str,
    chunk_count: int,
    datastore_type,
    db: Database,
    r: Redis,
):
    try:
        embeddings = get_embeddings_for_knowledgebase(knowledgebase_id, db, r)
        if not embeddings["embeddings"]:
            return json_util.dumps([])
        df = pd.DataFrame(embeddings["embeddings"])
        df["embeddings"] = df.embeddings.apply(np.array)
        df["similarity"] = df.embeddings.apply(
            lambda x: cosine_similarity(x, target_embedding)
        )

        results = json_util.dumps(
            df.sort_values("similarity", ascending=False)
            .head(chunk_count)[["chunkId", "similarity"]]
            .to_dict(orient="records")
        )

        return results
    except Exception as e:
        print(e)
        traceback.print_exc()
