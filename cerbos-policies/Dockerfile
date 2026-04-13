FROM ghcr.io/cerbos/cerbos:latest

COPY --chown=cerbos:cerbos . /policies

ENTRYPOINT ["/cerbos"]
CMD ["server", "--config=/policies/.cerbos.yaml"]
