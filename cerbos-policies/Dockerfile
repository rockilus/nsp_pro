FROM ghcr.io/cerbos/cerbos:0.53.0

COPY --chown=cerbos:cerbos . /policies

ENTRYPOINT ["/cerbos"]
CMD ["server", "--config=/policies/.cerbos.yaml"]
