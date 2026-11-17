export async function GET(request: Request) {
	const runtimeToken = process.env.OPENCUT_HEALTH_TOKEN;
	if (
		runtimeToken &&
		request.headers.get("x-opencut-health-token") !== runtimeToken
	) {
		return Response.json(
			{ service: "opencut", status: "unauthorized" },
			{ status: 401 },
		);
	}

	return Response.json({ service: "opencut", status: "ok" });
}
